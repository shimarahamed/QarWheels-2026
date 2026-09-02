import type { NextRequest } from 'next/server';
import { getVerifiedUserFromRequest, type VerifiedFirebaseUser } from '@/lib/firebase-auth';
import { claimsCoverBranch, readQwClaims, type QwClaims, type QwRole } from './qw-claims';

export type AuthorizedRequest = {
  user: VerifiedFirebaseUser;
  claims: QwClaims | null;
  role: QwRole;
};

type RequireRoleResult =
  | { ok: true; auth: AuthorizedRequest }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' };

async function authenticate(request: NextRequest): Promise<
  { user: VerifiedFirebaseUser; claims: QwClaims | null; role: QwRole } | null
> {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return null;
  const claims = readQwClaims(user.claims);
  const role: QwRole = claims?.r ?? 'customer';
  return { user, claims, role };
}

/** Requires the caller to be authenticated and hold one of the given roles. */
export async function requireRole(request: NextRequest, allowed: QwRole[]): Promise<RequireRoleResult> {
  const auth = await authenticate(request);
  if (!auth) return { ok: false, reason: 'unauthenticated' };
  if (!allowed.includes(auth.role)) return { ok: false, reason: 'forbidden' };
  return { ok: true, auth };
}

/**
 * Requires the caller to be a master admin, OR a business_owner/business_admin/
 * branch_manager/branch_staff whose claim covers the given branch.
 */
export async function requireBranchAccess(request: NextRequest, branchId: string): Promise<RequireRoleResult> {
  const auth = await authenticate(request);
  if (!auth) return { ok: false, reason: 'unauthenticated' };
  if (auth.role === 'master_admin') return { ok: true, auth };
  if (!auth.claims || !claimsCoverBranch(auth.claims, branchId)) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, auth };
}

/** Requires the caller to be a member (any role) of the given business. */
export async function requireBusinessAccess(request: NextRequest, businessId: string): Promise<RequireRoleResult> {
  const auth = await authenticate(request);
  if (!auth) return { ok: false, reason: 'unauthenticated' };
  if (auth.role === 'master_admin') return { ok: true, auth };
  if (!auth.claims || auth.claims.r === 'master_admin' || auth.claims.b !== businessId) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, auth };
}
