import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  failCommit: false,
}));

vi.mock('@/lib/auth/require-role', () => ({
  requireAction: async () => ({ ok: true, auth: { claims: { r: 'business_owner', b: 'business_1' } } }),
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` }),
      where: (_field: string, _op: string, businessId: string) => ({
        where: () => ({ limit: (max: number) => ({ name, businessId, max }) }),
      }),
    }),
    runTransaction: async (callback: (tx: {
      get: (ref: { path: string } | { name: string; businessId: string; max: number }) => Promise<unknown>;
      update: (ref: { path: string }, patch: Record<string, unknown>) => void;
      set: (ref: { path: string }, patch: Record<string, unknown>) => void;
    }) => Promise<unknown>) => {
      const writes: { path: string; patch: Record<string, unknown> }[] = [];
      const result = await callback({
        get: async (ref) => 'path' in ref
          ? { exists: state.docs.has(ref.path) }
          : { docs: [...state.docs.entries()]
            .filter(([path, data]) => path.startsWith(`${ref.name}/`)
              && data.businessId === ref.businessId && data.isListed === true)
            .slice(0, ref.max).map(([path]) => ({ ref: { path } })),
            get size() { return this.docs.length; } },
        update: (ref, patch) => writes.push({ path: ref.path, patch }),
        set: (ref, patch) => writes.push({ path: ref.path, patch }),
      });
      if (state.failCommit) throw new Error('commit failed');
      for (const { path, patch } of writes) state.docs.set(path, { ...state.docs.get(path), ...patch });
      return result;
    },
  }),
}));

import { POST } from '@/app/api/vendor/kyc/route';

const submit = () => POST(new NextRequest('http://localhost/api/vendor/kyc', {
  method: 'POST', body: JSON.stringify({ crNumber: 'CR1', licenseNumber: 'L1', iban: 'QA12345', documentPaths: [] }),
}));

beforeEach(() => {
  state.docs.clear();
  state.failCommit = false;
  state.docs.set('businesses/business_1', { status: 'Active', 'kyc.status': 'Verified' });
  state.docs.set('branches/own', { businessId: 'business_1', isListed: true });
  state.docs.set('branches/other', { businessId: 'business_2', isListed: true });
});

it('resubmits KYC and delists only this business in the same transaction', async () => {
  expect((await submit()).status).toBe(200);
  expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Pending');
  expect(state.docs.get('branches/own')!.isListed).toBe(false);
  expect(state.docs.get('branches/other')!.isListed).toBe(true);
  expect(state.docs.get('businesses_private/business_1')!.iban).toBe('QA12345');
});

it('leaves KYC and listing unchanged if the transaction fails', async () => {
  state.failCommit = true;
  expect((await submit()).status).toBe(500);
  expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Verified');
  expect(state.docs.get('branches/own')!.isListed).toBe(true);
  expect(state.docs.has('businesses_private/business_1')).toBe(false);
});

it('refuses to exceed the atomic write limit', async () => {
  for (let index = 0; index < 498; index++) state.docs.set(`branches/extra_${index}`, { businessId: 'business_1', isListed: true });
  expect((await submit()).status).toBe(409);
  expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Verified');
});
