import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  failCommit: false,
  writes: 0,
}));

vi.mock('@/lib/auth/require-role', () => ({
  requireAdminMutation: async () => ({ ok: true, auth: { user: { uid: 'admin_1', email: 'admin@example.test' } } }),
}));
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn() }));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    collection: (collectionName: string) => ({
      doc: (id: string) => ({ path: `${collectionName}/${id}` }),
      where: (field: string, _op: string, value: unknown) => ({
        where: (secondField: string, _secondOp: string, secondValue: unknown) => ({
          limit: (max: number) => ({ collectionName, field, value, secondField, secondValue, max }),
        }),
      }),
    }),
    runTransaction: async (callback: (tx: {
      get: (ref: { path: string } | { collectionName: string; field: string; value: unknown; secondField: string; secondValue: unknown; max: number }) => Promise<unknown>;
      update: (ref: { path: string }, patch: Record<string, unknown>) => void;
    }) => Promise<unknown>) => {
      const updates: { path: string; patch: Record<string, unknown> }[] = [];
      const result = await callback({
        get: async (ref) => 'path' in ref
          ? { exists: state.docs.has(ref.path), get: (field: string) => state.docs.get(ref.path)?.[field] }
          : (() => {
            const docs = [...state.docs.entries()]
              .filter(([path, data]) => path.startsWith(`${ref.collectionName}/`)
                && data[ref.field] === ref.value && data[ref.secondField] === ref.secondValue)
              .slice(0, ref.max).map(([path]) => ({ ref: { path } }));
            return { size: docs.length, docs };
          })(),
        update: (ref, patch) => updates.push({ path: ref.path, patch }),
      });
      if (state.failCommit) throw new Error('commit failed');
      for (const { path, patch } of updates) {
        Object.assign(state.docs.get(path)!, patch);
        state.writes++;
      }
      return result;
    },
  }),
}));

import { PATCH } from '@/app/api/admin/businesses/[businessId]/status/route';
import { writeAuditLog } from '@/lib/audit';

function change(status: string) {
  return PATCH(new NextRequest('http://localhost/api/admin/businesses/business_1/status', {
    method: 'PATCH', body: JSON.stringify({ status }),
  }), { params: Promise.resolve({ businessId: 'business_1' }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.docs.clear();
  state.failCommit = false;
  state.writes = 0;
  state.docs.set('businesses/business_1', { status: 'Active' });
  state.docs.set('branches/listed', { businessId: 'business_1', isListed: true });
  state.docs.set('branches/unlisted', { businessId: 'business_1', isListed: false });
  state.docs.set('branches/other', { businessId: 'business_2', isListed: true });
});

describe('admin business status', () => {
  it('atomically suspends a business and delists only its visible branches', async () => {
    const response = await change('Suspended');
    expect(response.status).toBe(200);
    expect(state.docs.get('businesses/business_1')!.status).toBe('Suspended');
    expect(state.docs.get('branches/listed')!.isListed).toBe(false);
    expect(state.docs.get('branches/other')!.isListed).toBe(true);
    expect(state.writes).toBe(2);
    expect(writeAuditLog).toHaveBeenCalledOnce();
  });

  it('reactivates without republishing branches', async () => {
    state.docs.get('businesses/business_1')!.status = 'Suspended';
    state.docs.get('branches/listed')!.isListed = false;
    expect((await change('Active')).status).toBe(200);
    expect(state.docs.get('businesses/business_1')!.status).toBe('Active');
    expect(state.docs.get('branches/listed')!.isListed).toBe(false);
    expect(state.writes).toBe(1);
  });

  it('does not partially suspend when the transaction fails', async () => {
    state.failCommit = true;
    expect((await change('Suspended')).status).toBe(500);
    expect(state.docs.get('businesses/business_1')!.status).toBe('Active');
    expect(state.docs.get('branches/listed')!.isListed).toBe(true);
    expect(state.writes).toBe(0);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('rejects 500 listed branches without changing the business', async () => {
    for (let index = 0; index < 499; index++) {
      state.docs.set(`branches/extra_${index}`, { businessId: 'business_1', isListed: true });
    }
    expect((await change('Suspended')).status).toBe(409);
    expect(state.docs.get('businesses/business_1')!.status).toBe('Active');
    expect(state.writes).toBe(0);
  });

  it('rejects an invalid status', async () => {
    expect((await change('Hidden')).status).toBe(400);
    expect(state.writes).toBe(0);
  });
});
