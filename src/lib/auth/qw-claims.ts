import type { MembershipRole } from '@/lib/types';

// Custom claim shape minted onto the Firebase Auth ID token by
// syncClaimsForUser (see claims.ts). Kept short — custom claims are capped
// at 1000 bytes total across the whole token.
export type QwClaims =
  | { r: MembershipRole; b: string; br: string[] }
  | { r: 'master_admin'; lvl: 'super' | 'ops' | 'support' };

export type QwRole = QwClaims['r'] | 'customer';

/** Extracts and type-narrows the `qw` custom claim from a raw JWT claims bag. */
export function readQwClaims(rawClaims: Record<string, unknown>): QwClaims | null {
  const qw = rawClaims.qw;
  if (!qw || typeof qw !== 'object') return null;
  const candidate = qw as Record<string, unknown>;
  if (typeof candidate.r !== 'string') return null;
  return candidate as unknown as QwClaims;
}

export function isMasterAdminClaims(claims: QwClaims | null): claims is Extract<QwClaims, { r: 'master_admin' }> {
  return claims?.r === 'master_admin';
}

export function isBusinessScopedClaims(
  claims: QwClaims | null,
): claims is Extract<QwClaims, { b: string }> {
  return claims !== null && claims.r !== 'master_admin';
}

/** True when the claim's branch scope covers this branch (owner/admin span all branches). */
export function claimsCoverBranch(claims: QwClaims, branchId: string): boolean {
  if (!isBusinessScopedClaims(claims)) return false;
  if (claims.r === 'business_owner' || claims.r === 'business_admin') return true;
  return claims.br.includes(branchId);
}
