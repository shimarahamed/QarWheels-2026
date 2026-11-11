import { type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { requireBranchAccess } from '@/lib/auth/require-role';
import { canAccess, canPerform } from '@/lib/auth/permissions';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import type { Booking, BookingQuote } from '@/lib/types';

const QuoteSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('offer'),
    amountMinorUnits: z.number().int().min(0).max(100_000_000),
    description: z.string().trim().min(1).max(1000),
    expectedRevision: z.number().int().min(0),
    requestId: z.string().uuid(),
  }).strict(),
  z.object({
    action: z.literal('accept'),
    revision: z.number().int().positive(),
  }).strict(),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();
  const parsed = QuoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Errors.badRequest('Invalid quote request', parsed.error.flatten().fieldErrors);
  const input = parsed.data;
  const { bookingId } = await params;

  try {
    const rateLimitKey = await getRateLimitKey('bookings:quote', user.uid);
    if (await isRateLimited(rateLimitKey, API_LIMITS.bookingTransition)) {
      trackRateLimit('bookings:quote', rateLimitKey);
      return Errors.rateLimited();
    }
    const db = getAdminFirestore();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return { error: 'Booking not found', code: 404 };
      const booking = snap.data() as Booking;
      const current = booking.quote;

      if (input.action === 'offer') {
        const access = await requireBranchAccess(request, booking.branchId);
        if (!access.ok) return { error: 'Forbidden', code: access.reason === 'unauthenticated' ? 401 : 403 };
        if (access.auth.role !== 'master_admin') {
          const claims = access.auth.claims;
          if (!claims || claims.r === 'master_admin' || claims.b !== booking.businessId ||
              !canAccess(claims.r, 'bookings', 'write') || !canPerform(claims.r, 'bookings.editCost')) {
            return { error: 'Forbidden', code: 403 };
          }
        }
        const branch = await tx.get(db.collection('branches').doc(booking.branchId));
        if (!branch.exists || branch.get('businessId') !== booking.businessId) {
          return { error: 'Forbidden', code: 403 };
        }

        // Retain request identities across revisions without growing the booking document.
        const receiptRef = bookingRef.collection('quote_requests').doc(input.requestId);
        const receipt = await tx.get(receiptRef);
        if (receipt.exists) {
          const prior = receipt.data()!;
          if (prior.offeredBy !== user.uid || prior.amountMinorUnits !== input.amountMinorUnits ||
              prior.description !== input.description || prior.expectedRevision !== input.expectedRevision) {
            return { error: 'This request ID was already used for different quote details', code: 409 };
          }
          if (current?.requestId !== input.requestId) {
            return { error: 'A newer quote is available. Review it before sending another change', code: 409 };
          }
          return { quote: current!, status: booking.status };
        }
        if (branch.get('isListed') !== true || branch.get('status') !== 'Approved' || branch.get('vacationMode') === true) {
          return { error: 'The garage is not taking requests', code: 409 };
        }
        const business = await tx.get(db.collection('businesses').doc(booking.businessId));
        if (!business.exists || business.get('status') !== 'Active') {
          return { error: 'The garage is not taking requests', code: 409 };
        }
        if (booking.status !== 'Pending' || current?.status === 'Accepted') {
          return { error: 'Only pending bookings can receive a quote', code: 409 };
        }
        if (input.expectedRevision !== (current?.revision ?? 0)) {
          return { error: 'Quote revision has changed', code: 409 };
        }

        const now = new Date().toISOString();
        const quote: BookingQuote = {
          revision: input.expectedRevision + 1,
          status: 'Offered',
          amountMinorUnits: input.amountMinorUnits,
          currency: 'QAR',
          description: input.description,
          offeredAt: now,
          offeredBy: user.uid,
          requestId: input.requestId,
        };
        tx.create(receiptRef, { ...input, offeredBy: user.uid });
        tx.update(bookingRef, { quote, requiresQuote: true, cost: FieldValue.delete(), updatedAt: now });
        return { quote, status: booking.status };
      }

      if (booking.userId !== user.uid) return { error: 'Forbidden', code: 403 };
      if (!current || current.revision !== input.revision) {
        return { error: 'Quote revision has changed', code: 409 };
      }
      if (current.status === 'Accepted' && current.acceptedBy === user.uid) {
        return { quote: current, status: booking.status };
      }
      if (booking.status !== 'Pending' || current.status !== 'Offered') {
        return { error: 'This quote is no longer available for acceptance', code: 409 };
      }

      const now = new Date().toISOString();
      const quote: BookingQuote = { ...current, status: 'Accepted', acceptedAt: now, acceptedBy: user.uid };
      tx.update(bookingRef, {
        quote,
        requiresQuote: true,
        cost: quote.amountMinorUnits / 100,
        status: 'Confirmed',
        acceptedAt: now,
        acceptedBy: user.uid,
        updatedAt: now,
        statusHistory: [...(booking.statusHistory ?? []), {
          status: 'Confirmed', at: now, byUid: user.uid, byRole: 'customer',
        }],
      });
      return { quote, status: 'Confirmed' as const };
    });

    if ('error' in result) return err(result.error!, result.code!);
    return ok({ quote: result.quote, status: result.status });
  } catch (error) {
    trackApiError('/api/bookings/[bookingId]/quote', error);
    return Errors.serverError();
  }
}
