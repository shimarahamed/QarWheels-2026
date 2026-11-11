import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  db: null as unknown,
  docs: new Map<string, Record<string, unknown>>(),
  creates: 0,
}));

vi.mock('@/lib/firebase-admin', () => ({ getAdminFirestore: () => state.db }));
vi.mock('@/lib/firebase-auth', () => ({
  getVerifiedUserFromRequest: async () => ({ uid: 'customer_1', email: 'customer@example.com' }),
}));
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: async () => false,
  getRateLimitKey: async () => 'test-key',
  API_LIMITS: { bookingCreate: { max: 12, windowSecs: 3600 } },
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn(), trackRateLimit: vi.fn() }));

import { POST } from '@/app/api/bookings/route';

const input = {
  branchId: 'branch_1', carId: 'car_1', serviceId: 'service_1',
  bookingDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  timeSlot: '10:00 AM', notes: 'Check the brakes',
  idempotencyKey: '4e5c190f-b8bb-4e73-9c39-7c1d1c4fed1b',
};

function request(body: unknown) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function makeDb() {
  function collection(path: string) {
    return { doc(id: string) {
      const fullPath = `${path}/${id}`;
      return { id, path: fullPath, collection: (name: string) => collection(`${fullPath}/${name}`) };
    } };
  }
  const tx = {
    get: async (ref: { path: string }) => {
      const value = state.docs.get(ref.path);
      return { exists: Boolean(value), data: () => value, get: (field: string) => value?.[field] };
    },
    create: (ref: { path: string }, value: Record<string, unknown>) => {
      if (state.docs.has(ref.path)) throw new Error('duplicate document');
      state.docs.set(ref.path, value);
      state.creates += 1;
    },
  };
  return { collection, runTransaction: (callback: (arg: typeof tx) => Promise<unknown>) => callback(tx) };
}

describe('server-owned booking creation', () => {
  beforeEach(() => {
    state.docs.clear();
    state.creates = 0;
    state.db = makeDb();
    state.docs.set('users/customer_1/cars/car_1', { userId: 'customer_1', year: 2024, make: 'Toyota', model: 'Camry' });
    state.docs.set('users/customer_1', { firstName: 'Test', lastName: 'Customer', email: 'customer@example.com' });
    state.docs.set('branches/branch_1', { businessId: 'business_1', name: 'Workshop', status: 'Approved', isListed: true, vacationMode: false });
    state.docs.set('branch_services/service_1', { businessId: 'business_1', branchId: 'branch_1', name: 'Brake inspection', active: true });
    state.docs.set('businesses/business_1', { status: 'Active' });
  });

  it('derives identity and tenancy from verified records, and reuses a retry', async () => {
    const first = await POST(request(input));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    const booking = state.docs.get(`bookings/${firstBody.data.id}`);
    expect(booking).toMatchObject({
      userId: 'customer_1', businessId: 'business_1', branchId: 'branch_1',
      serviceId: 'service_1', serviceName: 'Brake inspection', customerName: 'Test Customer',
      status: 'Pending', requiresQuote: true, carId: 'car_1', timeSlot: '10:00 AM',
    });
    expect(booking).not.toHaveProperty('cost');
    expect((await POST(request(input))).status).toBe(200);
    expect(state.creates).toBe(1);
  });

  it('rejects forged pricing and a changed retry payload', async () => {
    expect((await POST(request({ ...input, cost: 999999 }))).status).toBe(400);
    await POST(request(input));
    expect((await POST(request({ ...input, notes: 'Different request' }))).status).toBe(409);
    expect(state.creates).toBe(1);
  });

  it('returns an existing booking even after its preferred time passes', async () => {
    const first = await POST(request(input));
    expect(first.status).toBe(201);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.now() + 3 * 86_400_000));
      expect((await POST(request(input))).status).toBe(200);
      expect(state.creates).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects an unsaved car, mismatched service, or unavailable branch', async () => {
    state.docs.delete('users/customer_1/cars/car_1');
    expect((await POST(request(input))).status).toBe(400);
    state.docs.set('users/customer_1/cars/car_1', { userId: 'customer_1', year: 2024, make: 'Toyota', model: 'Camry' });
    state.docs.set('branch_services/service_1', { businessId: 'other_business', branchId: 'branch_1', name: 'Brake inspection', active: true });
    expect((await POST(request(input))).status).toBe(400);
    state.docs.set('branch_services/service_1', { businessId: 'business_1', branchId: 'branch_1', name: 'Brake inspection', active: true });
    state.docs.set('branches/branch_1', { businessId: 'business_1', name: 'Workshop', status: 'Pending Approval', isListed: false });
    expect((await POST(request(input))).status).toBe(400);
    expect(state.creates).toBe(0);
  });

  it('rejects preferred times outside the request window', async () => {
    const tooSoon = { ...input, bookingDate: new Date(Date.now() + 30 * 60_000).toISOString() };
    const tooLate = { ...input, bookingDate: new Date(Date.now() + 91 * 86_400_000).toISOString() };
    expect((await POST(request(tooSoon))).status).toBe(400);
    expect((await POST(request(tooLate))).status).toBe(400);
    expect(state.creates).toBe(0);
  });
});
