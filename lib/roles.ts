// Mirrors src/lib/auth/qw-claims.ts on the web side. Mobile has no build-time
// link to src/ (separate package/repo), so this is kept in sync by hand —
// same reasoning as mobile/lib/booking-workflow.ts duplicating the web
// BookingStatus union.

export type MembershipRole = 'business_owner' | 'business_admin' | 'branch_manager' | 'branch_staff';

export type QwClaims =
  | { r: MembershipRole; b: string; br: string[] }
  | { r: 'master_admin'; lvl: 'super' | 'ops' | 'support' };

export type QwRole = QwClaims['r'] | 'customer';

/** Extracts and type-narrows the `qw` custom claim from a decoded ID token's claims. */
export function readQwClaims(rawClaims: Record<string, unknown> | undefined | null): QwClaims | null {
  const qw = rawClaims?.qw;
  if (!qw || typeof qw !== 'object') return null;
  const candidate = qw as Record<string, unknown>;
  if (typeof candidate.r !== 'string') return null;
  return candidate as unknown as QwClaims;
}

export type VendorQwClaims = Extract<QwClaims, { b: string }>;

export function isVendorClaims(claims: QwClaims | null): claims is VendorQwClaims {
  return claims !== null && claims.r !== 'master_admin';
}
