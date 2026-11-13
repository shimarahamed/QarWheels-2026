import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  failCommit: false,
  concurrentApproval: false,
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
      doc: (id: string) => {
        const path = `${collectionName}/${id}`;
        return { path, get: async () => ({ exists: state.docs.has(path), data: () => state.docs.get(path) }) };
      },
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
      for (;;) {
        const updates: { path: string; patch: Record<string, unknown> }[] = [];
        const result = await callback({
          get: async (ref) => 'path' in ref
            ? { exists: state.docs.has(ref.path), data: () => state.docs.get(ref.path) }
            : { docs: [...state.docs.entries()]
              .filter(([path, data]) => path.startsWith(`${ref.collectionName}/`)
                && data[ref.field] === ref.value && data[ref.secondField] === ref.secondValue)
              .slice(0, ref.max).map(([path]) => ({ ref: { path } })) },
          update: (ref, patch) => updates.push({ path: ref.path, patch }),
        });
        if (state.concurrentApproval) {
          state.concurrentApproval = false;
          state.docs.get('businesses/business_1')!['kyc.status'] = 'Verified';
          state.docs.get('branches/approved')!.isListed = true;
          continue;
        }
        if (state.failCommit) throw new Error('commit failed');
        for (const { path, patch } of updates) {
          Object.assign(state.docs.get(path)!, patch);
          state.writes++;
        }
        return result;
      }
    },
  }),
}));

import { POST } from '@/app/api/admin/kyc/[businessId]/route';
import { writeAuditLog } from '@/lib/audit';

function review(decision: 'approve' | 'reject') {
  return POST(new NextRequest('http://localhost/api/admin/kyc/business_1', {
    method: 'POST', body: JSON.stringify({ decision, rejectionReason: decision === 'reject' ? 'Not verified' : undefined }),
  }), { params: Promise.resolve({ businessId: 'business_1' }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.docs.clear();
  state.failCommit = false;
  state.concurrentApproval = false;
  state.writes = 0;
  state.docs.set('businesses/business_1', { status: 'Active', kyc: { status: 'Pending' } });
  state.docs.set('branches/approved', { businessId: 'business_1', status: 'Approved', isListed: false });
  state.docs.set('branches/pending', { businessId: 'business_1', status: 'Pending Approval', isListed: false });
  state.docs.set('branches/other', { businessId: 'business_2', status: 'Approved', isListed: true });
});

describe('KYC review branch visibility', () => {
  it('atomically approves the business and lists only its approved branches', async () => {
    expect((await review('approve')).status).toBe(200);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Verified');
    expect(state.docs.get('branches/approved')!.isListed).toBe(true);
    expect(state.docs.get('branches/pending')!.isListed).toBe(false);
    expect(state.docs.get('branches/other')!.isListed).toBe(true);
    expect(state.writes).toBe(2);
    expect(writeAuditLog).toHaveBeenCalledOnce();
  });

  it('atomically rejects the business and delists every listed branch', async () => {
    state.docs.get('branches/approved')!.isListed = true;
    expect((await review('reject')).status).toBe(200);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Rejected');
    expect(state.docs.get('branches/approved')!.isListed).toBe(false);
    expect(state.docs.get('branches/other')!.isListed).toBe(true);
    expect(state.writes).toBe(2);
  });

  it('verifies a suspended business without listing its branches', async () => {
    state.docs.get('businesses/business_1')!.status = 'Suspended';
    state.docs.get('branches/approved')!.isListed = true;
    expect((await review('approve')).status).toBe(200);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Verified');
    expect(state.docs.get('branches/approved')!.isListed).toBe(false);
  });

  it('leaves both business and branches unchanged if the transaction fails', async () => {
    state.failCommit = true;
    expect((await review('approve')).status).toBe(500);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBeUndefined();
    expect(state.docs.get('branches/approved')!.isListed).toBe(false);
    expect(state.writes).toBe(0);
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it('retries a concurrent approval before rejecting and delists its branch', async () => {
    state.concurrentApproval = true;
    expect((await review('reject')).status).toBe(200);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBe('Rejected');
    expect(state.docs.get('branches/approved')!.isListed).toBe(false);
  });

  it('refuses to exceed the Firestore transaction write limit without a partial decision', async () => {
    for (let index = 0; index < 499; index++) {
      state.docs.set(`branches/extra_${index}`, { businessId: 'business_1', status: 'Approved', isListed: false });
    }
    expect((await review('approve')).status).toBe(409);
    expect(state.docs.get('businesses/business_1')!['kyc.status']).toBeUndefined();
    expect(state.writes).toBe(0);
  });
});
