import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import type { QwClaims } from './qw-claims';
import type { Membership } from '@/lib/types';

// A membership doc's role, promoted to a claim. Business-scoped roles carry
// {b, br}; master_admin carries {lvl} instead — see qw-claims.ts.
function membershipToClaims(membership: Membership): QwClaims {
  return {
    r: membership.role,
    b: membership.businessId,
    // Empty array means "all branches" for owner/admin roles.
    br: membership.branchIds,
  };
}

/**
 * Recomputes and sets this user's `qw` custom claim from their current
 * membership + admin-role state, then bumps users/{uid}.claimsRefreshedAt so
 * clients holding a stale ID token know to force a refresh.
 *
 * Precedence when a user somehow holds both: master_admin wins, since it is
 * the platform-wide role and is only ever granted out-of-band (never via the
 * self-service staff invite flow that grants business-scoped memberships).
 */
export async function syncClaimsForUser(uid: string): Promise<QwClaims | null> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const adminDoc = await db.collection('roles_admin').doc(uid).get();
  let claims: QwClaims | null = null;

  if (adminDoc.exists) {
    const level = (adminDoc.data()?.level as 'super' | 'ops' | 'support' | undefined) ?? 'ops';
    claims = { r: 'master_admin', lvl: level };
  } else {
    const membershipsSnap = await db
      .collection('memberships')
      .where('userId', '==', uid)
      .where('status', '==', 'Active')
      .get();

    // A user can in principle hold memberships at more than one business;
    // today's product surface only supports one active business per staff
    // member, so the first active membership found wins.
    const first = membershipsSnap.docs[0];
    if (first) {
      claims = membershipToClaims(first.data() as Membership);
    }
  }

  await auth.setCustomUserClaims(uid, claims ? { qw: claims } : null);
  await db.collection('users').doc(uid).set(
    { claimsRefreshedAt: new Date().toISOString() },
    { merge: true },
  );

  return claims;
}
