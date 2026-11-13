// Vendor-side booking transitions.
//
// These are the primary write path for booking status changes: every call goes
// through the server route at /api/bookings/{id}/transition, which is the only
// place that validates the transition against the actor's claims and atomically
// appends statusHistory + acceptedAt/declinedReason. The vendor UI does not
// use the legacy direct Firestore update helper as an offline fallback.
//
// Each function updates the Zustand store optimistically so the UI responds
// immediately, then rolls that update back and rethrows if the server rejects
// the transition — callers are expected to surface the error.
import { auth } from './firebase';
import { apiGet, apiPost } from './api';
import { useQarWheelStore } from './store';
import { nextForwardStatus, type BookingWorkflowStatus } from './booking-workflow';
import type { MembershipRole } from './roles';

type TransitionResponse = {
  status: BookingWorkflowStatus;
  from: BookingWorkflowStatus;
};

export type StaffRosterEntry = {
  id: string;
  userId: string;
  displayName: string;
  role: MembershipRole;
  status: 'Active' | 'Inactive';
  branchIds: string[];
};

export async function fetchStaffRoster(businessId: string): Promise<StaffRosterEntry[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again to see your team.');
  const result = await apiGet<{ roster: StaffRosterEntry[] }>(
    `/api/vendor/staff/roster?businessId=${encodeURIComponent(businessId)}`, token,
  );
  return result.roster;
}

export async function assignBookingStaff(bookingId: string, membershipId: string | null) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in again before assigning a team member.');
  return apiPost<{ assignedStaffId: string | null; assignedStaffName: string | null }>(
    `/api/bookings/${encodeURIComponent(bookingId)}/assignment`, token, { membershipId },
  );
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
