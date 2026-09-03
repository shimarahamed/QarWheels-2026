import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { ensureConnectAccount, sendPayout } from '@/lib/payments';
import { writeAuditLog } from '@/lib/audit';
import { trackApiError } from '@/lib/observability';
import type { Business, Payout, Transaction } from '@/lib/types';

// A vendor can't request a payout for a trivial amount — each transfer costs
// the platform a provider fee, so batching below this threshold loses money.
const MINIMUM_PAYOUT_MINOR_UNITS = 10_000; // QAR 100.00

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ['business_owner', 'business_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;
  if (!auth.claims || auth.claims.r === 'master_admin') return Errors.forbidden();
  const businessId = auth.claims.b;

  try {
    const db = getAdminFirestore();

    const businessSnap = await db.collection('businesses').doc(businessId).get();
    if (!businessSnap.exists) return Errors.notFound('Business');
    const business = businessSnap.data() as Business;

    // Money can't leave the platform to an unverified business — this is the
    // whole point of the KYC gate.
    if (business.kyc?.status !== 'Verified') {
      return Errors.badRequest('Your business must complete KYC verification before requesting a payout');
    }

    const settledSnap = await db.collection('transactions')
      .where('businessId', '==', businessId)
      .where('status', '==', 'Settled')
      .get();

    const available = settledSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Transaction) }))
      .filter((t) => !t.payoutId);

    if (available.length === 0) {
      return Errors.badRequest('There are no settled transactions available to pay out');
    }

    const grossMinorUnits = available.reduce((sum, t) => sum + t.grossMinorUnits, 0);
    const platformFeeMinorUnits = available.reduce((sum, t) => sum + t.commissionMinorUnits, 0);
    const netMinorUnits = available.reduce((sum, t) => sum + t.netMinorUnits, 0);

    if (netMinorUnits < MINIMUM_PAYOUT_MINOR_UNITS) {
      return Errors.badRequest(
        `Minimum payout is QAR ${(MINIMUM_PAYOUT_MINOR_UNITS / 100).toFixed(2)} — you currently have QAR ${(netMinorUnits / 100).toFixed(2)} available`,
      );
    }

    const dates = available
      .map((t) => String(t.createdAt))
      .filter(Boolean)
      .sort();
    const now = new Date().toISOString();

    const connect = await ensureConnectAccount(businessId);

    const payoutRef = db.collection('payouts').doc();
    const payout: Payout = {
      businessId,
      periodStart: dates[0] ?? now,
      periodEnd: dates[dates.length - 1] ?? now,
      grossMinorUnits,
      platformFeeMinorUnits,
      netMinorUnits,
      currency: 'QAR',
      status: 'Processing',
      transactionIds: available.map((t) => t.id),
      requestedAt: now,
      requestedBy: auth.user.uid,
      createdAt: now,
      updatedAt: now,
    };

    // Claim the transactions and create the payout together, so a
    // concurrent second request can't pay the same transactions twice.
    const batch = db.batch();
    batch.set(payoutRef, payout);
    for (const t of available) {
      batch.update(db.collection('transactions').doc(t.id), { payoutId: payoutRef.id });
    }
    await batch.commit();

    const transfer = await sendPayout({
      businessId,
      connectAccountId: connect.accountId,
      amountMinorUnits: netMinorUnits,
      currency: 'QAR',
      payoutId: payoutRef.id,
    });

    await payoutRef.update({
      status: transfer.status,
      ...(transfer.providerTransferId ? { providerTransferId: transfer.providerTransferId } : {}),
      ...(transfer.status === 'Paid' ? { paidAt: new Date().toISOString() } : {}),
      ...(transfer.failureReason ? { failureReason: transfer.failureReason } : {}),
      updatedAt: new Date().toISOString(),
    });

    await writeAuditLog({
      actorId: auth.user.uid,
      actorRole: auth.claims.r,
      actorEmail: auth.user.email,
      businessId,
      action: 'business.update',
      resourceType: 'payout',
      resourceId: payoutRef.id,
      after: { netMinorUnits, transactionCount: available.length, status: transfer.status },
      outcome: 'success',
    });

    return ok({
      payoutId: payoutRef.id,
      netMinorUnits,
      status: transfer.status,
      // Surfaced so the UI can be honest that nothing settled for real yet.
      paymentsLive: transfer.live,
    });
  } catch (error) {
    trackApiError('/api/vendor/payouts/request', error);
    return Errors.serverError();
  }
}
