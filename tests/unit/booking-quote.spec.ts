import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  db: null as unknown,
  docs: new Map<string, Record<string, any>>(),
  uid: 'vendor_1' as string | null,
  role: 'vendor_manager',
  businessId: 'business_1',
  branchAccess: true,
  limited: false,
  fail: false,
  writes: 0,
  deleteField: Symbol('delete'),
  retry: null as (() => void) | null,
}));

vi.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: () => state.db }));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { delete: () => state.deleteField } }));
vi.mock('@/lib/firebase-auth', () => ({
  getVerifiedUserFromRequest: async () => state.uid ? { uid: state.uid } : null,
}));
vi.mock('@/lib/auth/require-role', () => ({
  requireBranchAccess: async () => state.branchAccess ? {
    ok: true, auth: {
      role: state.role, user: { uid: state.uid },
      claims: state.role === 'customer' ? null : { r: state.role, b: state.businessId, br: ['branch_1'] },
    },
  } : { ok: false, reason: 'forbidden' },
}));
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: async () => state.limited,
  getRateLimitKey: async () => 'test-key',
  API_LIMITS: { bookingTransition: {} },
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn(), trackRateLimit: vi.fn() }));
vi.mock('@/lib/push', () => ({
  getPushTokensForUsers: async () => [], sendPushNotifications: vi.fn(),
}));

import { POST } from '@/app/api/bookings/[bookingId]/quote/route';
import { POST as transition } from '@/app/api/bookings/[bookingId]/transition/route';

const offer = {
  action: 'offer', amountMinorUnits: 12345, description: '  Brake repair  ', expectedRevision: 0,
  requestId: '4e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b',
};
const secondId = '5e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b';
const params = { params: Promise.resolve({ bookingId: 'booking_1' }) };
const booking = () => state.docs.get('bookings/booking_1')!;
function request(body: unknown) {
  return new NextRequest('http://localhost/api/bookings/booking_1/quote', {
    method: 'POST', body: JSON.stringify(body),
  });
}
const post = (body: unknown) => POST(request(body), params);

function makeDb() {
  function collection(path: string) {
    return { doc(id: string) {
      return { path: `${path}/${id}`, collection: (name: string) => collection(`${path}/${id}/${name}`) };
    } };
  }
  return {
    collection,
    runTransaction: async (callback: (tx: any) => Promise<unknown>) => {
      if (state.fail) throw new Error('Database unavailable');
      let writes: Array<() => void> = [];
      const tx = {
        get: async (ref: { path: string }) => {
          const value = structuredClone(state.docs.get(ref.path));
          return { exists: Boolean(value), data: () => value, get: (field: string) => value?.[field] };
        },
        create: (ref: { path: string }, value: Record<string, unknown>) => writes.push(() => {
          if (state.docs.has(ref.path)) throw new Error('Duplicate document');
          state.docs.set(ref.path, value);
        }),
        update: (ref: { path: string }, value: Record<string, unknown>) => writes.push(() => {
          const current = state.docs.get(ref.path)!;
          for (const [key, entry] of Object.entries(value)) {
            if (entry === state.deleteField) delete current[key];
            else current[key] = entry;
          }
          state.writes += 1;
        }),
      };
      let result = await callback(tx);
      if (state.retry) {
        const retry = state.retry;
        state.retry = null;
        retry();
        writes = [];
        result = await callback(tx);
      }
      for (const write of writes) write();
      return result;
    },
  };
}

beforeEach(() => {
  state.docs.clear();
  state.uid = 'vendor_1';
  state.role = 'vendor_manager';
  state.businessId = 'business_1';
  state.branchAccess = true;
  state.limited = false;
  state.fail = false;
  state.retry = null;
  state.writes = 0;
  state.db = makeDb();
  state.docs.set('branches/branch_1', {
    businessId: 'business_1', isListed: true, status: 'Approved', vacationMode: false,
  });
  state.docs.set('businesses/business_1', { status: 'Active' });
  state.docs.set('bookings/booking_1', {
    userId: 'customer_1', businessId: 'business_1', branchId: 'branch_1', branchName: 'Garage',
    status: 'Pending', requiresQuote: true,
    statusHistory: [{ status: 'Pending', at: '2026-11-01', byUid: 'customer_1', byRole: 'customer' }],
    partsUsed: [{ name: 'Brake pads', qty: 1 }], laborEntries: [], photoPaths: ['photo.jpg'],
  });
});

describe('booking quote contract', () => {
  it('offers a normalized server-owned quote without assigning cost or confirming', async () => {
    const response = await post(offer);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { quote: booking().quote, status: 'Pending' } });
    expect(booking().quote).toEqual({
      revision: 1, status: 'Offered', currency: 'QAR', amountMinorUnits: 12345,
      description: 'Brake repair', offeredBy: 'vendor_1', offeredAt: expect.any(String), requestId: offer.requestId,
    });
    expect(booking()).not.toHaveProperty('cost');
    expect(booking().statusHistory).toHaveLength(1);
    expect(booking().photoPaths).toEqual(['photo.jpg']);
  });

  it.each([0, 100_000_000])('accepts amount boundary %s', async (amountMinorUnits) => {
    expect((await post({ ...offer, amountMinorUnits })).status).toBe(200);
    state.uid = 'customer_1';
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(200);
    expect(booking().cost).toBe(amountMinorUnits / 100);
  });

  it.each([
    { amountMinorUnits: -1 }, { amountMinorUnits: 100_000_001 }, { amountMinorUnits: 1.5 },
    { amountMinorUnits: '100' }, { description: '   ' }, { description: 'x'.repeat(1001) },
    { expectedRevision: -1 }, { expectedRevision: 0.5 }, { expectedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { requestId: 'not-a-uuid' }, { cost: 1 }, { currency: 'USD' }, { acceptedBy: 'customer_1' },
  ])('rejects invalid offer %j', async (patch) => {
    expect((await post({ ...offer, ...patch })).status).toBe(400);
    expect(state.writes).toBe(0);
  });

  it.each([0, -1, 1.5, '1', null])('rejects invalid acceptance revision %j', async (revision) => {
    expect((await post({ action: 'accept', revision })).status).toBe(400);
  });

  it('rejects malformed JSON and forged acceptance fields', async () => {
    expect((await POST(new NextRequest('http://localhost', { method: 'POST', body: '{' }), params)).status).toBe(400);
    expect((await post({ action: 'accept', revision: 1, amountMinorUnits: 0 })).status).toBe(400);
  });

  it('retries the same normalized offer without writing again', async () => {
    await post(offer);
    const original = structuredClone(booking());
    expect((await post({ ...offer, description: 'Brake repair' })).status).toBe(200);
    expect(booking()).toEqual(original);
    expect(state.writes).toBe(1);
  });

  it('rejects new offers for inactive garages but preserves an identical retry', async () => {
    await post(offer);
    state.docs.get('branches/branch_1')!.isListed = false;
    expect((await post({ ...offer, requestId: secondId, expectedRevision: 1 })).status).toBe(409);
    expect((await post(offer)).status).toBe(200);
    expect(state.writes).toBe(1);
  });

  it.each([
    ['branch approval', () => { state.docs.get('branches/branch_1')!.status = 'Suspended'; }],
    ['branch vacation', () => { state.docs.get('branches/branch_1')!.vacationMode = true; }],
    ['business status', () => { state.docs.get('businesses/business_1')!.status = 'Suspended'; }],
    ['missing business', () => { state.docs.delete('businesses/business_1'); }],
  ])('rejects a new offer when %s is inactive', async (_label, change) => {
    change();
    expect((await post(offer)).status).toBe(409);
    expect(state.writes).toBe(0);
  });

  it.each([{ amountMinorUnits: 1 }, { description: 'Other work' }, { expectedRevision: 1 }])(
    'rejects request ID reuse with changed payload %j', async (patch) => {
      await post(offer);
      expect((await post({ ...offer, ...patch })).status).toBe(409);
      expect(state.writes).toBe(1);
    },
  );

  it('retains request identities but rejects an old retry after a newer revision', async () => {
    await post(offer);
    await post({ ...offer, requestId: secondId, expectedRevision: 1, amountMinorUnits: 20000 });
    expect(booking().quote.revision).toBe(2);
    const retry = await post(offer);
    expect(retry.status).toBe(409);
    expect((await post({ ...offer, expectedRevision: 2 })).status).toBe(409);
    expect(state.writes).toBe(2);
  });

  it('rejects stale offers and acceptance revisions', async () => {
    await post(offer);
    expect((await post({ ...offer, requestId: secondId })).status).toBe(409);
    state.uid = 'customer_1';
    expect((await post({ action: 'accept', revision: 2 })).status).toBe(409);
    expect(state.writes).toBe(1);
  });

  it('accepts atomically with exact cost, customer metadata, and one history entry', async () => {
    await post(offer);
    state.uid = 'customer_1';
    const response = await post({ action: 'accept', revision: 1 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { quote: booking().quote, status: 'Confirmed' } });
    expect(booking()).toMatchObject({
      status: 'Confirmed', cost: 123.45, requiresQuote: true,
      acceptedBy: 'customer_1', acceptedAt: booking().quote.acceptedAt,
      quote: { status: 'Accepted', acceptedBy: 'customer_1', acceptedAt: expect.any(String) },
    });
    expect(booking().statusHistory).toHaveLength(2);
    expect(booking().statusHistory[1]).toEqual({
      status: 'Confirmed', at: booking().acceptedAt, byUid: 'customer_1', byRole: 'customer',
    });
    expect(booking().partsUsed).toEqual([{ name: 'Brake pads', qty: 1 }]);
  });

  it.each(['Confirmed', 'InProgress', 'Completed', 'Cancelled'])('acceptance retry preserves progressed status %s', async (status) => {
    await post(offer);
    state.uid = 'customer_1';
    await post({ action: 'accept', revision: 1 });
    booking().status = status;
    const original = structuredClone(booking());
    const response = await post({ action: 'accept', revision: 1 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { quote: booking().quote, status } });
    expect(booking()).toEqual(original);
    expect(state.writes).toBe(2);
  });

  it.each(['Confirmed', 'Cancelled', 'Declined', 'Completed'])('rejects new offers and acceptance when %s', async (status) => {
    await post(offer);
    booking().status = status;
    expect((await post({ ...offer, requestId: secondId, expectedRevision: 1 })).status).toBe(409);
    state.uid = 'customer_1';
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(409);
  });

  it('opts a legacy pending booking into quotes and clears its unaccepted cost', async () => {
    delete booking().requiresQuote;
    booking().cost = 999;
    expect((await post(offer)).status).toBe(200);
    expect(booking().requiresQuote).toBe(true);
    expect(booking()).not.toHaveProperty('cost');
  });

  it('rechecks the revision when a competing offer causes the transaction to retry', async () => {
    state.retry = () => { booking().quote = { revision: 1, status: 'Offered', requestId: secondId }; };
    expect((await post(offer)).status).toBe(409);
    expect(state.writes).toBe(0);
    expect(state.docs.has(`bookings/booking_1/quote_requests/${offer.requestId}`)).toBe(false);
  });

  it.each(['revision', 'cancel'])('rejects acceptance if a competing %s change wins', async (change) => {
    await post(offer);
    state.uid = 'customer_1';
    state.retry = () => {
      if (change === 'revision') booking().quote.revision = 2;
      else booking().status = 'Cancelled';
    };
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(409);
    expect(state.writes).toBe(1);
    expect(booking().statusHistory).toHaveLength(1);
  });

  it('does not duplicate acceptance history on a transaction retry after another acceptance', async () => {
    await post(offer);
    state.uid = 'customer_1';
    state.retry = () => {
      booking().quote = { ...booking().quote, status: 'Accepted', acceptedBy: 'customer_1' };
      booking().status = 'Confirmed';
      booking().statusHistory.push({ status: 'Confirmed' });
    };
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(200);
    expect(state.writes).toBe(1);
    expect(booking().statusHistory).toHaveLength(2);
  });
});

describe('quote access and failure boundaries', () => {
  it.each(['business_owner', 'vendor_admin', 'vendor_manager', 'master_admin'])('allows pricing role %s', async (role) => {
    state.role = role;
    expect((await post(offer)).status).toBe(200);
  });
  it.each(['vendor_staff', 'vendor_cashier', 'vendor_inventory', 'customer'])('rejects nonpricing role %s', async (role) => {
    state.role = role;
    expect((await post(offer)).status).toBe(403);
    expect(state.writes).toBe(0);
  });
  it('rejects missing branch access, cross-business claims, and mismatched branch tenancy', async () => {
    state.branchAccess = false;
    expect((await post(offer)).status).toBe(403);
    state.branchAccess = true;
    state.businessId = 'other';
    expect((await post(offer)).status).toBe(403);
    state.businessId = 'business_1';
    state.docs.set('branches/branch_1', { businessId: 'other' });
    expect((await post(offer)).status).toBe(403);
    state.role = 'master_admin';
    expect((await post(offer)).status).toBe(403);
    state.docs.delete('branches/branch_1');
    expect((await post(offer)).status).toBe(403);
  });
  it('only allows the booking customer to accept, including retries', async () => {
    await post(offer);
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(403);
    state.role = 'master_admin';
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(403);
    state.uid = 'customer_1';
    await post({ action: 'accept', revision: 1 });
    state.uid = 'other_customer';
    expect((await post({ action: 'accept', revision: 1 })).status).toBe(403);
  });
  it('prevents a second pricing user from replaying another user request ID', async () => {
    await post(offer);
    state.uid = 'vendor_2';
    expect((await post(offer)).status).toBe(409);
  });
  it('handles unauthorized, rate limited, missing booking and database failure', async () => {
    state.uid = null;
    expect((await post(offer)).status).toBe(401);
    state.uid = 'vendor_1';
    state.limited = true;
    expect((await post(offer)).status).toBe(429);
    state.limited = false;
    state.docs.delete('bookings/booking_1');
    expect((await post(offer)).status).toBe(404);
    state.fail = true;
    expect((await post(offer)).status).toBe(500);
  });
});

describe('transition endpoint quote boundary', () => {
  it.each(['vendor_manager', 'master_admin'])('blocks %s from confirming without customer acceptance', async (role) => {
    state.role = role;
    expect((await transition(request({ status: 'Confirmed' }), params)).status).toBe(409);
    await post(offer);
    expect((await transition(request({ status: 'Confirmed' }), params)).status).toBe(409);
    expect(booking().status).toBe('Pending');
  });
  it('retains legacy confirmation and cost semantics', async () => {
    delete booking().requiresQuote;
    booking().cost = 321;
    expect((await transition(request({ status: 'Confirmed' }), params)).status).toBe(200);
    expect(booking()).toMatchObject({ status: 'Confirmed', cost: 321, acceptedBy: 'vendor_1' });
  });
  it('allows normal progress after acceptance without replacing customer acceptance metadata', async () => {
    await post(offer);
    state.uid = 'customer_1';
    await post({ action: 'accept', revision: 1 });
    const acceptedAt = booking().acceptedAt;
    state.uid = 'vendor_1';
    state.role = 'master_admin';
    expect((await transition(request({ status: 'Confirmed' }), params)).status).toBe(200);
    expect((await transition(request({ status: 'VehicleReceived' }), params)).status).toBe(200);
    expect(booking().acceptedBy).toBe('customer_1');
    expect(booking().acceptedAt).toBe(acceptedAt);
  });
  it.each(['Declined', 'Cancelled'])('allows %s before acceptance', async (status) => {
    expect((await transition(request({ status }), params)).status).toBe(200);
    expect(booking().status).toBe(status);
  });
});
