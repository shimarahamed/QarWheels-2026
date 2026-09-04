import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireSection } from '@/lib/auth/require-role';
import { paymentsAreLive } from '@/lib/payments';
import { trackApiError } from '@/lib/observability';
import type { Payout, Transaction, WithId } from '@/lib/types';

// Payout history plus the currently-available balance: every settled
// transaction not yet rolled into a payout. Owner/admin only — a
// branch_manager or branch_staff has no business seeing company finances.
export async function GET(request: NextRequest) {
  const access = await requireSection(request, 'payouts');
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
    const [payoutsSnap, unpaidSnap] = await Promise.all([
      db.collection('payouts').where('businessId', '==', businessId).orderBy('createdAt', 'desc').limit(50).get(),
      db.collection('transactions')
        .where('businessId', '==', businessId)
        .where('status', '==', 'Settled')
        .get(),
    ]);

    const payouts: WithId<Payout>[] = payoutsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Payout) }));

    // A transaction is "available" once settled and not yet attached to a
    // payout. Filtered here rather than in the query because Firestore can't
    // express "field is absent" alongside the other constraints without a
    // second index and a sentinel value.
    const available = unpaidSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Transaction) }))
      .filter((t) => !t.payoutId);

    const availableGross = available.reduce((sum, t) => sum + t.grossMinorUnits, 0);
    const availableCommission = available.reduce((sum, t) => sum + t.commissionMinorUnits, 0);
    const availableNet = available.reduce((sum, t) => sum + t.netMinorUnits, 0);

    return ok({
      payouts,
      available: {
        transactionCount: available.length,
        grossMinorUnits: availableGross,
        commissionMinorUnits: availableCommission,
        netMinorUnits: availableNet,
        currency: 'QAR',
      },
      transactions: available,
      // Lets the UI tell the vendor that payouts aren't actually settling
      // yet, rather than silently implying money is on its way.
      paymentsLive: paymentsAreLive(),
    });
  } catch (error) {
    trackApiError('/api/vendor/payouts GET', error);
    return Errors.serverError();
  }
}
