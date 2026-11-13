import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  access: 'allowed' as 'allowed' | 'unauthenticated' | 'forbidden',
  branchAccess: true,
  limited: false,
  docs: new Map<string, Record<string, any>>(),
  writes: 0,
  onTransaction: null as (() => void) | null,
}));

vi.mock('@/lib/auth/require-role', () => ({
  requireSection: async () => state.access === 'allowed'
    ? { ok: true, auth: { user: { uid: 'vendor_1' } } }
    : { ok: false, reason: state.access },
  requireBranchAccess: async () => ({ ok: state.branchAccess }),
}));
vi.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: () => ({
  collection: (name: string) => ({ doc: (id: string) => {
    const path = `${name}/${id}`;
    return { path, get: async () => snapshot(path) };
  } }),
  runTransaction: async (callback: (tx: {
    get: (ref: { path: string }) => Promise<ReturnType<typeof snapshot>>;
    update: (ref: { path: string }, patch: Record<string, unknown>) => void;
  }) => Promise<unknown>) => {
    state.onTransaction?.();
    let write: (() => void) | undefined;
    const result = await callback({
      get: async (ref) => snapshot(ref.path),
      update: (ref, patch) => { write = () => {
        Object.assign(state.docs.get(ref.path)!, patch);
        state.writes++;
      }; },
    });
    write?.();
    return result;
  },
}) }));
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: async () => 'test',
  isRateLimited: async () => state.limited,
  API_LIMITS: { bookingTransition: {} },
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn(), trackRateLimit: vi.fn() }));

import { POST } from '@/app/api/bookings/[bookingId]/assignment/route';

function snapshot(path: string) {
  const value = structuredClone(state.docs.get(path));
  return { exists: !!value, data: () => value, get: (field: string) => value?.[field] };
}

const booking = () => state.docs.get('bookings/booking_1')!;
const member = () => state.docs.get('memberships/member_1')!;
function post(body: unknown, bookingId = 'booking_1') {
  return POST(new NextRequest(`http://localhost/api/bookings/${bookingId}/assignment`, {
    method: 'POST', body: JSON.stringify(body),
  }), { params: Promise.resolve({ bookingId }) });
}

beforeEach(() => {
  state.access = 'allowed';
  state.branchAccess = true;
  state.limited = false;
  state.writes = 0;
  state.onTransaction = null;
  state.docs.clear();
  state.docs.set('bookings/booking_1', {
    businessId: 'business_1', branchId: 'branch_1', status: 'Confirmed',
    notes: 'Keep this job card', partsUsed: [{ name: 'Brake pads' }],
  });
  state.docs.set('branches/branch_1', { businessId: 'business_1' });
  state.docs.set('memberships/member_1', {
    businessId: 'business_1', branchIds: ['branch_1'], role: 'vendor_staff',
    status: 'Active', displayName: 'Technician',
  });
});

describe('server-owned booking assignment', () => {
  it('rejects unauthenticated and unauthorized callers without changing the booking', async () => {
    for (const [access, status] of [['unauthenticated', 401], ['forbidden', 403]] as const) {
      state.access = access;
      expect((await post({ membershipId: 'member_1' })).status).toBe(status);
    }
    expect(state.writes).toBe(0);
    expect(booking()).not.toHaveProperty('assignedStaffId');
  });

  it('rejects forged payloads and booking IDs', async () => {
    for (const payload of [{ membershipId: 'member_1', assignedStaffName: 'Forged' },
      { membershipId: '../other' }, { membershipId: 12 }, {}]) {
      expect((await post(payload)).status).toBe(400);
    }
    expect((await post({ membershipId: 'member_1' }, 'bad/id')).status).toBe(400);
    expect(state.writes).toBe(0);
  });

  it('rejects a caller outside the booking branch', async () => {
    state.branchAccess = false;
    expect((await post({ membershipId: 'member_1' })).status).toBe(403);
    expect(state.writes).toBe(0);
  });

  it.each([
    ['cross-business', () => { member().businessId = 'business_2'; }],
    ['cross-branch', () => { member().branchIds = ['branch_2']; }],
    ['inactive', () => { member().status = 'Inactive'; }],
    ['missing', () => { state.docs.delete('memberships/member_1'); }],
  ])('rejects a %s membership', async (_label, change) => {
    change();
    expect((await post({ membershipId: 'member_1' })).status).toBe(400);
    expect(state.writes).toBe(0);
  });

  it('rejects a booking whose branch belongs to another business', async () => {
    state.docs.get('branches/branch_1')!.businessId = 'business_2';
    expect((await post({ membershipId: 'member_1' })).status).toBe(409);
    expect(state.writes).toBe(0);
  });

  it.each(['Completed', 'Cancelled', 'Declined', 'NoShow'])(
    'rejects assignment on terminal booking %s', async (status) => {
      booking().status = status;
      expect((await post({ membershipId: 'member_1' })).status).toBe(409);
      expect(state.writes).toBe(0);
    },
  );

  it('rechecks booking tenancy and status in the transaction', async () => {
    state.onTransaction = () => { booking().branchId = 'branch_2'; };
    expect((await post({ membershipId: 'member_1' })).status).toBe(409);
    booking().branchId = 'branch_1';
    state.onTransaction = () => { booking().status = 'Completed'; };
    expect((await post({ membershipId: 'member_1' })).status).toBe(409);
    expect(state.writes).toBe(0);
  });

  it('assigns and unassigns while preserving job-card fields', async () => {
    const originalJobCard = { notes: booking().notes, partsUsed: booking().partsUsed };
    const assigned = await post({ membershipId: 'member_1' });
    expect(assigned.status).toBe(200);
    expect(await assigned.json()).toEqual({ data: {
      assignedStaffId: 'member_1', assignedStaffName: 'Technician',
    } });
    expect(booking()).toMatchObject({ ...originalJobCard,
      assignedStaffId: 'member_1', assignedStaffName: 'Technician', updatedAt: expect.any(String),
    });
    const unassigned = await post({ membershipId: null });
    expect(unassigned.status).toBe(200);
    expect(await unassigned.json()).toEqual({ data: {
      assignedStaffId: null, assignedStaffName: null,
    } });
    expect(booking()).toMatchObject({ ...originalJobCard,
      assignedStaffId: null, assignedStaffName: null,
    });
    expect(state.writes).toBe(2);
  });
});
