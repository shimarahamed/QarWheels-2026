import type { NextRequest } from 'next/server';
import { getVerifiedUserFromRequest, type VerifiedFirebaseUser } from '@/lib/firebase-auth';
import { claimsCoverBranch, readQwClaims, type QwClaims, type QwRole } from './qw-claims';
import { canAccess, canPerform, type VendorAction, type VendorSection } from './permissions';

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
 * Requires the caller to hold the given level of access to a dashboard
 * section, per the matrix in permissions.ts. Prefer this over listing roles
 * by hand at a call site: when a role's permissions change, the matrix is the
 * only thing that should need editing.
 *
 * master_admin passes everything — it's the platform support role, and the
 * matrix only describes vendor-side roles.
 */
export async function requireSection(
  request: NextRequest,
  section: VendorSection,
  need: 'read' | 'write' = 'read',
): Promise<RequireRoleResult> {
  const auth = await authenticate(request);
  if (!auth) return { ok: false, reason: 'unauthenticated' };
  if (auth.role === 'master_admin') return { ok: true, auth };
  if (auth.role === 'customer' || !auth.claims || auth.claims.r === 'master_admin') {
    return { ok: false, reason: 'forbidden' };
  }
  if (!canAccess(auth.claims.r, section, need)) return { ok: false, reason: 'forbidden' };
  return { ok: true, auth };
}

/**
 * Requires the caller to hold a specific fine-grained permission — the
 * carve-outs that a whole-section grant doesn't capture (pricing a job,
 * requesting a payout). Check the section too where both apply.
 */
export async function requireAction(
  request: NextRequest,
  action: VendorAction,
): Promise<RequireRoleResult> {
  const auth = await authenticate(request);
  if (!auth) return { ok: false, reason: 'unauthenticated' };
  if (auth.role === 'master_admin') return { ok: true, auth };
  if (auth.role === 'customer' || !auth.claims || auth.claims.r === 'master_admin') {
    return { ok: false, reason: 'forbidden' };
  }
  if (!canPerform(auth.claims.r, action)) return { ok: false, reason: 'forbidden' };
  return { ok: true, auth };
}

/**
 * Requires the caller to be a master admin, or a business member whose claim
 * covers the given branch (business-wide roles cover every branch).
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
