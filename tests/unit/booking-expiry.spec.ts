import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Booking = Record<string, unknown>;
const state = vi.hoisted(() => ({
  db: null as unknown,
  booking: null as Booking | null,
  writes: 0,
  afterQuery: null as (() => void) | null,
  conflict: null as (() => void) | null,
}));

vi.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: () => state.db }));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn() }));

import { POST } from '@/app/api/bookings/expire/route';

function request(secret = 'cron-test-secret') {
  return new NextRequest('http://localhost/api/bookings/expire', {
    method: 'POST', headers: { 'x-cron-secret': secret },
  });
}

function makeDb() {
  const ref = { id: 'booking_1' };
  const query = {
    where: () => query,
    limit: () => query,
    get: async () => {
      const queried = structuredClone(state.booking);
      state.afterQuery?.();
      return { docs: [{ ref, data: () => queried }] };
    },
  };
  return {
    collection: () => query,
    runTransaction: async (callback: (tx: {
      get: () => Promise<{ exists: boolean; data: () => Booking | null }>;
      update: (_ref: unknown, data: Booking) => void;
    }) => Promise<boolean>) => {
      let staged: Booking | null = null;
      const tx = {
        get: async () => {
          const snapshot = structuredClone(state.booking);
          return { exists: snapshot !== null, data: () => snapshot };
        },
        update: (_ref: unknown, data: Booking) => { staged = data; },
      };
      let result = await callback(tx);
      if (state.conflict) {
        state.conflict();
        state.conflict = null;
        staged = null;
        result = await callback(tx);
      }
      if (staged) {
        state.booking = { ...state.booking, ...staged };
        state.writes += 1;
      }
      return result;
    },
  };
}

describe('scheduled booking expiry', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T10:00:00.000Z'));
    state.booking = {
      status: 'Pending', expiresAt: '2026-11-11T09:00:00.000Z',
      statusHistory: [{ status: 'Pending' }],
    };
    state.writes = 0;
    state.afterQuery = null;
    state.conflict = null;
    state.db = makeDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('expires a pending request and is safe to repeat', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(state.booking).toMatchObject({ status: 'Declined', declinedReason: 'auto_expired' });
    expect(state.booking?.statusHistory).toEqual([
      { status: 'Pending' },
      { status: 'Declined', at: '2026-11-11T10:00:00.000Z', byUid: 'system', byRole: 'master_admin', note: 'auto_expired' },
    ]);
    expect(await (await POST(request())).json()).toEqual({ data: { expired: 0 } });
    expect(state.writes).toBe(1);
  });

  it('keeps a booking accepted after the initial query', async () => {
    state.afterQuery = () => { state.booking!.status = 'Confirmed'; };
    expect(await (await POST(request())).json()).toEqual({ data: { expired: 0 } });
    expect(state.booking?.status).toBe('Confirmed');
    expect(state.writes).toBe(0);
  });

  it('rechecks acceptance when Firestore retries a transaction after a concurrent write', async () => {
    state.conflict = () => { state.booking!.status = 'Confirmed'; };
    expect(await (await POST(request())).json()).toEqual({ data: { expired: 0 } });
    expect(state.booking?.status).toBe('Confirmed');
    expect(state.writes).toBe(0);
  });

  it.each([undefined, 'not-a-date', '2026-11-11T11:00:00.000Z'])(
    'does not expire a missing, invalid or extended deadline (%s)', async (expiresAt) => {
      state.afterQuery = () => { state.booking!.expiresAt = expiresAt; };
      expect(await (await POST(request())).json()).toEqual({ data: { expired: 0 } });
      expect(state.writes).toBe(0);
    },
  );

  it('ignores a booking deleted after the initial query', async () => {
    state.afterQuery = () => { state.booking = null; };
    expect(await (await POST(request())).json()).toEqual({ data: { expired: 0 } });
    expect(state.writes).toBe(0);
  });

  it('rejects an invalid or unconfigured cron secret before accessing Firestore', async () => {
    state.db = null;
    expect((await POST(request('wrong'))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await POST(request())).status).toBe(401);
  });
});
