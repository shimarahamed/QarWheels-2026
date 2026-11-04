// Mirrors src/lib/auth/qw-claims.ts on the web side. Mobile has no build-time
// link to src/ (separate package/repo), so this is kept in sync by hand —
// same reasoning as mobile/lib/booking-workflow.ts duplicating the web
// BookingStatus union.

// What each role may actually do lives in mobile/lib/permissions.ts (mirror
// of src/lib/auth/permissions.ts) — this union is only the legal values.
export type MembershipRole =
  | 'business_owner'
  | 'vendor_admin'
  | 'vendor_manager'
  | 'vendor_staff'
  | 'vendor_cashier'
  | 'vendor_inventory';

export type QwClaims =
  | { r: MembershipRole; b: string; br: string[] }
  | { r: 'master_admin'; lvl: 'super' | 'ops' | 'support' };

export type QwRole = QwClaims['r'] | 'customer';

/** Extracts and type-narrows the `qw` custom claim from a decoded ID token's claims. */
export function readQwClaims(rawClaims: Record<string, unknown> | undefined | null): QwClaims | null {
  const qw = rawClaims?.qw;
  if (!qw || typeof qw !== 'object' || Array.isArray(qw)) return null;
  const candidate = qw as Record<string, unknown>;
  if (candidate.r === 'master_admin') {
    return candidate.lvl === 'super' || candidate.lvl === 'ops' || candidate.lvl === 'support'
      ? { r: 'master_admin', lvl: candidate.lvl } : null;
  }
  const roles: readonly string[] = ['business_owner', 'vendor_admin', 'vendor_manager', 'vendor_staff', 'vendor_cashier', 'vendor_inventory'];
  if (typeof candidate.r !== 'string' || !roles.includes(candidate.r)
    || typeof candidate.b !== 'string' || !candidate.b.trim() || candidate.b.includes('/')
    || !Array.isArray(candidate.br)
    || !candidate.br.every((id) => typeof id === 'string' && !!id.trim() && !id.includes('/'))) return null;
  return { r: candidate.r as MembershipRole, b: candidate.b, br: [...new Set(candidate.br as string[])] };
}

export type VendorQwClaims = Extract<QwClaims, { b: string }>;

export function isVendorClaims(claims: QwClaims | null): claims is VendorQwClaims {
  return claims !== null && claims.r !== 'master_admin';
}
