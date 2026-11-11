import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireBranchAccess } from '@/lib/auth/require-role';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { canTransitionBooking, actorAllowedTransitions, type BookingActorRole, type BookingStatus, type Booking, type Membership } from '@/lib/types';
import { canAccess, isBusinessWideRole } from '@/lib/auth/permissions';
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
  actorRole: BookingActorRole;
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
    .map((d) => d.data() as Membership)
    // Business-wide roles cover every branch; everyone else only hears about
    // the branches they're actually assigned to. Roles with no access to
    // bookings at all (inventory) are left out — a cancellation isn't theirs
    // to action, so notifying them would just be noise.
    .filter(
      (m) =>
        canAccess(m.role, 'bookings') &&
        (isBusinessWideRole(m.role) || m.branchIds.includes(result.branchId)),
    )
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
// this route atomically writes statusHistory and transition metadata, then
// notifies the other side. Completion does not prove payment or settle funds.
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
      let actorRole: BookingActorRole;

      if (isOwner) {
        actorRole = 'customer';
      } else {
        const access = await requireBranchAccess(request, booking.branchId);
        if (!access.ok) return { error: access.reason };
        const branch = await tx.get(db.collection('branches').doc(booking.branchId));
        if (!branch.exists || branch.get('businessId') !== booking.businessId) {
          return { error: 'forbidden' as const };
        }
        if (access.auth.role === 'master_admin') {
          actorRole = 'master_admin';
        } else {
          const claims = access.auth.claims;
          if (!claims || claims.r === 'master_admin') return { error: 'forbidden' as const };
          // Belonging to the branch isn't enough — the role has to be one
          // whose job includes working bookings at all.
          if (!canAccess(claims.r, 'bookings', 'write')) return { error: 'forbidden' as const };
          actorRole = claims.r;
        }
      }

      const currentStatus = booking.status;
      if (booking.requiresQuote && (
        (currentStatus === 'Pending' && requestedStatus === 'Confirmed') ||
        (!['Pending', 'Declined', 'Cancelled'].includes(requestedStatus) && booking.quote?.status !== 'Accepted')
      )) {
        return { error: 'quote_required' as const };
      }
      const allowed = actorRole === 'master_admin'
        ? true
        : actorAllowedTransitions(actorRole, currentStatus).includes(requestedStatus as BookingStatus);

      if (!allowed || !canTransitionBooking(currentStatus, requestedStatus as BookingStatus)) {
        return { error: 'invalid_transition' as const, currentStatus };
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
      if (requestedStatus === 'Confirmed' && !booking.requiresQuote) {
        update.acceptedAt = now;
        update.acceptedBy = user.uid;
      }
      if (requestedStatus === 'Declined') {
        update.declinedAt = now;
        update.declinedReason = declinedReason ?? 'No reason provided';
      }

      tx.update(bookingRef, update);

      return {
        ok: true as const,
        from: currentStatus,
        to: requestedStatus,
        businessId: booking.businessId,
        branchId: booking.branchId,
        branchName: booking.branchName,
        customerUserId: booking.userId,
        actorRole,
      };
    });

    if ('error' in result) {
      if (result.error === 'not_found') return Errors.notFound('Booking');
      if (result.error === 'unauthenticated') return Errors.unauthorized();
      if (result.error === 'forbidden') return Errors.forbidden();
      if (result.error === 'quote_required') return err('Customer quote acceptance is required', 409);
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
