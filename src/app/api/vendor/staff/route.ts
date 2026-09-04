import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireSection } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';
import type { Membership, StaffInvite, WithId } from '@/lib/types';

// Lists every membership + pending invite for the caller's business.
// Firestore rules deliberately keep `memberships` list-query-only for
// master_admin (a business-scoped list query can't be safely expressed as a
// per-document rule), so the owner/admin staff page reads through here
// instead, which uses the Admin SDK and filters server-side.
export async function GET(request: NextRequest) {
  const access = await requireSection(request, 'staff');
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;

  const url = new URL(request.url);
  const requestedBusinessId = url.searchParams.get('businessId');
  const businessId = auth.role === 'master_admin'
    ? requestedBusinessId
    : (auth.claims && auth.claims.r !== 'master_admin' ? auth.claims.b : null);

  if (!businessId) return Errors.badRequest('businessId is required');

  try {
    const db = getAdminFirestore();
    const [membershipsSnap, invitesSnap] = await Promise.all([
      db.collection('memberships').where('businessId', '==', businessId).get(),
      db.collection('staff_invites').where('businessId', '==', businessId).where('status', '==', 'Pending').get(),
    ]);

    const members: WithId<Membership>[] = membershipsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Membership) }));
    const pendingInvites: WithId<StaffInvite>[] = invitesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as StaffInvite) }));

    return ok({ members, pendingInvites });
  } catch (error) {
    trackApiError('/api/vendor/staff GET', error);
    return Errors.serverError();
  }
}
