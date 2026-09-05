import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireBusinessAccess } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';
import type { Membership, WithId } from '@/lib/types';

// Lightweight roster read: just enough to render an assignment picker or a
// "who's on what" board — id, name, role, status. Any member of the business
// can read it (technicians need to see peers, cashiers/staff need it for the
// booking assignment picker), unlike /api/vendor/staff, which returns the
// full management payload (contact info, pending invites) and is gated to
// the 'staff' section, which staff/cashier/inventory roles don't have.
//
// Firestore rules deliberately keep `memberships` list-query-only for
// master_admin (see firestore.rules), so this route reads via the Admin SDK
// and filters server-side instead of letting the client query the collection
// directly.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get('businessId');
  if (!businessId) return Errors.badRequest('businessId is required');

  const access = await requireBusinessAccess(request, businessId);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('memberships').where('businessId', '==', businessId).get();
    const roster = snap.docs.map((d) => {
      const data = d.data() as Membership;
      return {
        id: d.id,
        userId: data.userId,
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        branchIds: data.branchIds,
      } satisfies Partial<WithId<Membership>>;
    });

    return ok({ roster });
  } catch (error) {
    trackApiError('/api/vendor/staff/roster GET', error);
    return Errors.serverError();
  }
}
