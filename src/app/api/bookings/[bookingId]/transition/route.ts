import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireBranchAccess } from '@/lib/auth/require-role';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { canTransitionBooking, actorAllowedTransitions, type BookingStatus, type Booking, type Transaction } from '@/lib/types';
import { calculateCommission } from '@/lib/payments';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import { getPushTokensForUsers, sendPushNotifications } from '@/lib/push';

const TransitionSchema = z.object({
  status: z.enum([
    'Pending', 'Confirmed', 'VehicleReceived', 'InProgress', 'ReadyForPickup',
    'Completed', 'Declined', 'Cancelled', 'NoShow',
  ]),
  declinedReason: z.string().max(300).optional(),
});

// Mirrors mobile/lib/notifications.ts's notifyBookingStatusChange() labels —
// kept in sync manually since this is a server module and that's a client
// one; a real shared-package boundary is more machinery than two small
// label maps warrant right now.
const CUSTOMER_STATUS_LABELS: Partial<Record<BookingStatus, string>> = {
  Confirmed: 'Booking confirmed',
  VehicleReceived: 'Vehicle received',
  InProgress: 'Service started',
  ReadyForPickup: 'Ready for pickup',
  Completed: 'Service complete',
  Declined: 'Booking declined',
  Cancelled: 'Booking cancelled',
  NoShow: 'Marked as no-show',
};

type TransitionResult = {
  ok: true;
  from: BookingStatus;
  to: BookingStatus;
  businessId: string;
  branchId: string;
  branchName: string;
  customerUserId: string;
  actorRole: 'customer' | 'branch_staff' | 'business_owner' | 'business_admin' | 'master_admin';
  transactionId: string | null;
};

/**
 * Notifies the side that DIDN'T make the change: staff acted → notify the
 * customer; the customer acted (cancel) → notify the branch's staff. Never
 * notifies the actor about their own action, and never blocks or fails the
 * transition itself — see the .catch() at the call site.
 */
async function sendNotificationsForTransition(result: TransitionResult, bookingId: string): Promise<void> {
  const staffActed = result.actorRole !== 'customer';

  if (staffActed) {
    const label = CUSTOMER_STATUS_LABELS[result.to] ?? 'Booking updated';
    const recipients = await getPushTokensForUsers([result.customerUserId]);
    if (recipients.length === 0) return;
    await sendPushNotifications(recipients, {
      title: label,
      body: `${result.branchName} — your booking is now ${result.to.toLowerCase()}.`,
      data: { type: 'booking_status', bookingId, status: result.to },
      channelId: 'booking-updates',
    });
    return;
  }

  // Customer cancelled — notify the branch's active staff so it clears
  // from their requests/bookings view without them having to notice on
  // their own. Only relevant transition a customer can make is -> Cancelled
  // (canTransitionBooking already enforced that upstream), but the
  // to-Cancelled check here is defensive in case that ever changes.
  if (result.to !== 'Cancelled') return;
  const db = getAdminFirestore();
  const membershipsSnap = await db.collection('memberships')
    .where('businessId', '==', result.businessId)
    .where('status', '==', 'Active')
    .get();
  const staffUserIds = membershipsSnap.docs
    .map((d) => d.data() as { userId: string; role: string; branchIds: string[] })
    .filter((m) => m.role === 'business_owner' || m.role === 'business_admin' || m.branchIds.includes(result.branchId))
    .map((m) => m.userId);
  if (staffUserIds.length === 0) return;

  const recipients = await getPushTokensForUsers(staffUserIds);
  if (recipients.length === 0) return;
  await sendPushNotifications(recipients, {
    title: 'Booking cancelled',
    body: `A customer cancelled their booking at ${result.branchName}.`,
    data: { type: 'booking_status', bookingId, status: result.to },
    channelId: 'booking-updates',
  });
}

// The single server-side enforcement point for booking status changes.
// Firestore rules independently enforce the same transition table as a
// floor (so a direct SDK write from either app still can't skip a step),
// but only THIS route can atomically write statusHistory + acceptedAt/
// declinedReason/declinedAt together, create the ledger entry (on
// ->Completed), and send a push notification to whichever side didn't
// make the change (see sendNotificationsForTransition below). One gap
// this route can't close: a brand-new booking (customer -> Pending) is
// still created via a direct client Firestore write (see
// mobile/lib/firestoreOps.ts createBooking, gated by firestore.rules'
// bookings create rule), not through an API route, so there's no
// server-side hook to notify branch staff of a NEW request today — only
// existing-booking transitions go through here. Closing that needs either
// routing booking creation through a server route too, or a Firestore
// trigger (Cloud Functions, which this project doesn't currently deploy).
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

  const rateLimitKey = await getRateLimitKey('bookings:transition', user.uid);
  if (await isRateLimited(rateLimitKey, API_LIMITS.bookingTransition)) {
    trackRateLimit('bookings:transition', rateLimitKey);
    return Errors.rateLimited();
  }

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
        branchName: booking.branchName,
        customerUserId: booking.userId,
        actorRole,
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

    // Push delivery is genuinely best-effort: it must never fail or delay
    // the response the transition itself succeeded on. Errors inside
    // sendNotificationsForTransition are already caught and tracked by
    // sendPushNotifications/getPushTokensForUsers; this just adds one more
    // layer so a bug in recipient-selection logic can't take the route down.
    sendNotificationsForTransition(result, bookingId).catch((error) => {
      trackApiError('/api/bookings/[bookingId]/transition:notify', error);
    });

    return ok({ status: result.to, from: result.from });
  } catch (error) {
    trackApiError('/api/bookings/[bookingId]/transition', error);
    return Errors.serverError();
  }
}
