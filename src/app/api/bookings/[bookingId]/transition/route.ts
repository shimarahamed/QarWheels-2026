import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireBranchAccess } from '@/lib/auth/require-role';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { canTransitionBooking, actorAllowedTransitions, type BookingStatus, type Booking, type Transaction } from '@/lib/types';
import { calculateCommission } from '@/lib/payments';
import { trackApiError } from '@/lib/observability';

const TransitionSchema = z.object({
  status: z.enum([
    'Pending', 'Confirmed', 'VehicleReceived', 'InProgress', 'ReadyForPickup',
    'Completed', 'Declined', 'Cancelled', 'NoShow',
  ]),
  declinedReason: z.string().max(300).optional(),
});

// The single server-side enforcement point for booking status changes.
// Firestore rules independently enforce the same transition table as a
// floor (so a direct SDK write from either app still can't skip a step),
// but only THIS route can atomically write statusHistory + acceptedAt/
// declinedReason/declinedAt together and is where notification delivery and
// ledger-entry creation (Phase 3 payouts, on ->Completed) hook in.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = TransitionSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { status: requestedStatus, declinedReason } = parsed.data;

  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  const db = getAdminFirestore();
  const bookingRef = db.collection('bookings').doc(bookingId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return { error: 'not_found' as const };
      const booking = snap.data() as Booking;

      const isOwner = booking.userId === user.uid;
      let actorRole: 'customer' | 'branch_staff' | 'business_owner' | 'business_admin' | 'master_admin';

      if (isOwner) {
        actorRole = 'customer';
      } else {
        const access = await requireBranchAccess(request, booking.branchId);
        if (!access.ok) return { error: access.reason };
        actorRole = access.auth.role === 'master_admin' ? 'master_admin' : (access.auth.role as typeof actorRole);
      }

      const currentStatus = booking.status;
      const allowed = actorRole === 'master_admin'
        ? true
        : actorAllowedTransitions(actorRole, currentStatus).includes(requestedStatus as BookingStatus);

      if (!allowed || !canTransitionBooking(currentStatus, requestedStatus as BookingStatus)) {
        return { error: 'invalid_transition' as const, currentStatus };
      }

      // ── All reads must happen before any write in a Firestore
      // transaction, so the ledger lookups come first even though the
      // corresponding write happens further down.
      const grossMinorUnits = Math.round((booking.cost ?? 0) * 100);
      const shouldCreateTransaction = requestedStatus === 'Completed' && grossMinorUnits > 0;

      let commissionRateBps = 1000;
      let alreadyBilled = true;
      if (shouldCreateTransaction) {
        const [existing, businessSnap] = await Promise.all([
          tx.get(db.collection('transactions').where('bookingId', '==', bookingId).limit(1)),
          tx.get(db.collection('businesses').doc(booking.businessId)),
        ]);
        alreadyBilled = !existing.empty;
        commissionRateBps = (businessSnap.data()?.commissionRateBps as number | undefined) ?? 1000;
      }

      const now = new Date().toISOString();
      const historyEntry = {
        status: requestedStatus,
        at: now,
        byUid: user.uid,
        byRole: actorRole,
        ...(declinedReason ? { note: declinedReason } : {}),
      };

      const update: Record<string, unknown> = {
        status: requestedStatus,
        updatedAt: now,
        statusHistory: [...(booking.statusHistory ?? []), historyEntry],
      };
      if (requestedStatus === 'Confirmed') {
        update.acceptedAt = now;
        update.acceptedBy = user.uid;
      }
      if (requestedStatus === 'Declined') {
        update.declinedAt = now;
        update.declinedReason = declinedReason ?? 'No reason provided';
      }

      tx.update(bookingRef, update);

      // Completing a booking creates its ledger entry in the same
      // transaction — a completed job and the money owed for it must never
      // be able to diverge. Skipped when the booking was already billed, so
      // a re-completion can't double-charge.
      let transactionId: string | null = null;
      if (shouldCreateTransaction && !alreadyBilled) {
        const commissionMinorUnits = calculateCommission(grossMinorUnits, commissionRateBps);
        const transactionRef = db.collection('transactions').doc();
        const transaction: Transaction = {
          businessId: booking.businessId,
          branchId: booking.branchId,
          bookingId,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          grossMinorUnits,
          commissionMinorUnits,
          netMinorUnits: grossMinorUnits - commissionMinorUnits,
          currency: 'QAR',
          status: 'Settled',
          createdAt: now,
        };
        tx.set(transactionRef, transaction);
        transactionId = transactionRef.id;
      }

      return {
        ok: true as const,
        from: currentStatus,
        to: requestedStatus,
        businessId: booking.businessId,
        branchId: booking.branchId,
        transactionId,
      };
    });

    if ('error' in result) {
      if (result.error === 'not_found') return Errors.notFound('Booking');
      if (result.error === 'unauthenticated') return Errors.unauthorized();
      if (result.error === 'forbidden') return Errors.forbidden();
      return Errors.badRequest(
        `Cannot transition from ${'currentStatus' in result ? result.currentStatus : 'current status'} to ${requestedStatus}`,
      );
    }

    // Notification delivery (push/email) hooks in here once a token registry
    // exists — deliberately not built yet, see Phase 3 plan.

    return ok({ status: result.to, from: result.from });
  } catch (error) {
    trackApiError('/api/bookings/[bookingId]/transition', error);
    return Errors.serverError();
  }
}
