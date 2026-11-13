import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/firebase-auth', () => ({ getVerifiedUserFromRequest: mocks.user }));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({ collection: () => ({ doc: () => ({ get: mocks.get }) }) }),
}));
import { requireAction, requireAdminMutation, requireBranchAccess, requireRole, requireSection } from '@/lib/auth/require-role';

const request = {} as NextRequest;

describe('API authority checks', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('rejects a revoked admin holding an old token', async () => {
    mocks.user.mockResolvedValue({ uid: 'admin', claims: { qw: { r: 'master_admin', lvl: 'super' } } });
    mocks.get.mockResolvedValue({ exists: false, get: () => undefined });
    expect(await requireRole(request, ['master_admin'])).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('uses the current admin level after a downgrade', async () => {
    mocks.user.mockResolvedValue({ uid: 'admin', claims: { qw: { r: 'master_admin', lvl: 'super' } } });
    mocks.get.mockResolvedValue({ exists: true, get: () => 'support' });
    const access = await requireRole(request, ['master_admin']);
    expect(access.ok && access.auth.claims).toEqual({ r: 'master_admin', lvl: 'support' });
    expect(await requireAdminMutation(request)).toEqual({ ok: false, reason: 'forbidden' });
    expect((await requireSection(request, 'bookings')).ok).toBe(true);
    expect(await requireSection(request, 'bookings', 'write')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await requireAction(request, 'staff.manage')).toEqual({ ok: false, reason: 'forbidden' });
    expect((await requireBranchAccess(request, 'branch_1')).ok).toBe(true);
    expect(await requireBranchAccess(request, 'branch_1', 'write')).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('allows an ops admin to mutate', async () => {
    mocks.user.mockResolvedValue({ uid: 'admin', claims: { qw: { r: 'master_admin', lvl: 'support' } } });
    mocks.get.mockResolvedValue({ exists: true, get: () => 'ops' });
    expect((await requireAdminMutation(request)).ok).toBe(true);
  });

  it('rejects access to another business even for a business-wide owner', async () => {
    mocks.user.mockResolvedValue({ uid: 'owner', claims: { qw: { r: 'business_owner', b: 'business_a', br: [] } } });
    mocks.get.mockResolvedValue({ exists: true, get: () => 'business_b' });
    expect(await requireBranchAccess(request, 'branch_b')).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('allows the owner to act on a branch of their own business', async () => {
    mocks.user.mockResolvedValue({ uid: 'owner', claims: { qw: { r: 'business_owner', b: 'business_a', br: [] } } });
    mocks.get.mockResolvedValue({ exists: true, get: () => 'business_a' });
    expect((await requireBranchAccess(request, 'branch_a')).ok).toBe(true);
  });
});
