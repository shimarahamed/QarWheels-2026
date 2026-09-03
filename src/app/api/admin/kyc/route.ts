import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';
import type { Business, WithId } from '@/lib/types';

// Lists businesses with a pending KYC submission, oldest-first — the admin
// review queue.
export async function GET(request: NextRequest) {
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('businesses')
      .where('kyc.status', '==', 'Pending')
      .orderBy('kyc.submittedAt', 'asc')
      .get();

    const businesses: WithId<Business>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Business) }));
    return ok({ businesses });
  } catch (error) {
    trackApiError('/api/admin/kyc', error);
    return Errors.serverError();
  }
}
