import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireBranchAccess, requireSection } from '@/lib/auth/require-role';
import { isBusinessWideRole } from '@/lib/auth/permissions';
import { getRateLimitKey, isRateLimited, API_LIMITS } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import type { Booking, Membership } from '@/lib/types';

const AssignmentSchema = z.object({
  membershipId: z.string().regex(/^(?!\.{1,2}$)[^/\\]{1,128}$/).nullable(),
}).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const access = await requireSection(request, 'bookings', 'write');
  if (!access.ok) return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();

  const { bookingId } = await params;
  if (!/^(?!\.{1,2}$)[^/\\]{1,128}$/.test(bookingId)) return Errors.badRequest('Invalid booking ID');
  const parsed = AssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Errors.badRequest('Invalid assignment request');

  try {
    const rateLimitKey = await getRateLimitKey('bookings:assignment', access.auth.user.uid);
    if (await isRateLimited(rateLimitKey, API_LIMITS.bookingTransition)) {
      trackRateLimit('bookings:assignment', rateLimitKey);
      return Errors.rateLimited();
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const initial = await bookingRef.get();
    if (!initial.exists) return Errors.notFound('Booking');
    const initialBooking = initial.data() as Booking;
    if (!initialBooking.branchId || !initialBooking.businessId) return Errors.badRequest('Booking has no branch');
    const branchAccess = await requireBranchAccess(request, initialBooking.branchId, 'write');
    if (!branchAccess.ok) return Errors.forbidden();

    const result = await db.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) return { error: 'Booking not found', status: 404 };
      const booking = bookingSnap.data() as Booking;
      if (booking.branchId !== initialBooking.branchId ||
        booking.businessId !== initialBooking.businessId) {
        return { error: 'Booking changed. Refresh and try again', status: 409 };
      }
      if (['Completed', 'Cancelled', 'Declined', 'NoShow'].includes(booking.status)) {
        return { error: 'This booking can no longer be assigned', status: 409 };
      }
      const branchRef = db.collection('branches').doc(booking.branchId);
      const memberRef = parsed.data.membershipId
        ? db.collection('memberships').doc(parsed.data.membershipId) : null;
      const [branchSnap, memberSnap] = await Promise.all([
        tx.get(branchRef), memberRef ? tx.get(memberRef) : Promise.resolve(null),
      ]);
      if (!branchSnap.exists || branchSnap.get('businessId') !== booking.businessId) {
        return { error: 'Booking branch is unavailable', status: 409 };
      }
      let staffName: string | null = null;
      if (memberRef) {
        if (!memberSnap?.exists) return { error: 'Staff member is unavailable', status: 400 };
        const member = memberSnap.data() as Membership;
        if (member.businessId !== booking.businessId || member.status !== 'Active' ||
          !Array.isArray(member.branchIds) ||
          (!isBusinessWideRole(member.role) && !member.branchIds.includes(booking.branchId)) ||
          typeof member.displayName !== 'string' || !member.displayName.trim()) {
          return { error: 'Staff member is not active at this branch', status: 400 };
        }
        staffName = member.displayName.trim();
      }
      tx.update(bookingRef, {
        assignedStaffId: parsed.data.membershipId,
        assignedStaffName: staffName,
        updatedAt: new Date().toISOString(),
      });
      return { assignedStaffId: parsed.data.membershipId, assignedStaffName: staffName };
    });
    if ('error' in result && typeof result.error === 'string') return err(result.error, result.status);
    return ok(result);
  } catch (error) {
    trackApiError('/api/bookings/:id/assignment', error);
    return Errors.serverError();
  }
}
