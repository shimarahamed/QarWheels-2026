// Vendor-side booking transitions.
//
// These are the primary write path for booking status changes: every call goes
// through the server route at /api/bookings/{id}/transition, which is the only
// place that validates the transition against the actor's claims and atomically
// appends statusHistory + acceptedAt/declinedReason. The raw Firestore write in
// firestoreOps.ts (updateVendorBookingStatusInFirestore) stays available as an
// offline fallback per the architecture plan, but is no longer what the vendor
// UI calls.
//
// Each function updates the Zustand store optimistically so the UI responds
// immediately, then rolls that update back and rethrows if the server rejects
// the transition — callers are expected to surface the error.
import { auth } from './firebase';
import { apiPost } from './api';
import { useQarWheelStore } from './store';
import { nextForwardStatus, type BookingWorkflowStatus } from './booking-workflow';

type TransitionResponse = {
  status: BookingWorkflowStatus;
  from: BookingWorkflowStatus;
};

// Seed-demo bookings (id prefixed "vb_") have no Firestore document behind
// them, so the server would 404. They stay local-only, same as the previous
// direct-write path did.
function isLiveBooking(bookingId: string): boolean {
  return !bookingId.startsWith('vb_');
}

async function transition(
  bookingId: string,
  status: BookingWorkflowStatus,
  declinedReason?: string,
): Promise<void> {
  const store = useQarWheelStore.getState();
  const previousStatus = store.vendorBookings.find((b) => b.id === bookingId)?.status;

  // Optimistic local update first so the UI responds immediately...
  store.updateVendorBookingStatus(bookingId, status);

  if (!isLiveBooking(bookingId)) return;

  try {
    const token = (await auth.currentUser?.getIdToken()) ?? null;
    // ...then let the server validate and persist it. A rejection here means
    // the optimistic status was never real, so undo it.
    await apiPost<TransitionResponse>(
      `/api/bookings/${bookingId}/transition`,
      token,
      { status, ...(declinedReason ? { declinedReason } : {}) },
    );
  } catch (error) {
    if (previousStatus) {
      useQarWheelStore.getState().updateVendorBookingStatus(bookingId, previousStatus);
    }
    throw error;
  }
}

export async function acceptBooking(bookingId: string): Promise<void> {
  return transition(bookingId, 'Confirmed');
}

export async function declineBooking(bookingId: string, reason: string): Promise<void> {
  return transition(bookingId, 'Declined', reason);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  return transition(bookingId, 'Cancelled');
}

export async function advanceBookingStatus(
  bookingId: string,
  currentStatus: BookingWorkflowStatus,
): Promise<void> {
  const next = nextForwardStatus(currentStatus);
  if (!next) {
    throw new Error(`Booking is already ${currentStatus} and cannot be advanced further.`);
  }
  return transition(bookingId, next);
}
