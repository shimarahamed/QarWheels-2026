import type { FieldValue, Timestamp } from 'firebase/firestore';

// ─── Utility ──────────────────────────────────────────────────────────────────

export type WithId<T> = T & { id: string };

/** Firestore server timestamp — either a resolved Timestamp or a pending FieldValue */
export type FirestoreDate = Timestamp | FieldValue | Date | string;

// ─── Core Domain Types ────────────────────────────────────────────────────────

export type ServiceRecord = {
  userId: string;
  carId: string;
  vendorId: string;
  serviceType: string;
  serviceDescription: string;
  serviceDate: string;
  mileageAtService: number;
  cost: number;
  invoiceUrl?: string;
  notes?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type Car = {
  userId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  color?: string;
  engineType?: string;
  currentMileage: number;
  lastMileageUpdateDate: string;
  purchaseDate?: string;
  imageUrl?: string;
  imageId?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

// ─── Booking status — canonical 7+2 state machine ────────────────────────────
// Single source of truth for both apps. Web imports from here; mobile's
// mobile/lib/booking-workflow.ts defines the same union (mobile has no
// package/workspace link to src/, so it is kept in sync by hand — see
// packages/tokens in a later phase for a generated-file sharing mechanism).

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'VehicleReceived'
  | 'InProgress'
  | 'ReadyForPickup'
  | 'Completed'
  | 'Declined'
  | 'Cancelled'
  | 'NoShow';

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  Pending: ['Confirmed', 'Declined', 'Cancelled'],
  Confirmed: ['VehicleReceived', 'Cancelled', 'NoShow'],
  VehicleReceived: ['InProgress', 'Cancelled'],
  InProgress: ['ReadyForPickup'],
  ReadyForPickup: ['Completed'],
  Completed: [],
  Declined: [],
  Cancelled: [],
  NoShow: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return from === to || BOOKING_TRANSITIONS[from].includes(to);
}

/**
 * Transitions a given actor role may perform from the current status —
 * drives both UIs (customer only ever sees "Cancel"; branch staff see the
 * forward-moving set). Distinct from BOOKING_TRANSITIONS, which is the full
 * set the datastore allows regardless of actor.
 */
export function actorAllowedTransitions(
  role: 'customer' | 'branch_staff' | 'business_owner' | 'business_admin' | 'master_admin',
  from: BookingStatus,
): BookingStatus[] {
  if (role === 'customer') {
    return BOOKING_TRANSITIONS[from].includes('Cancelled') ? ['Cancelled'] : [];
  }
  // Staff/owner/admin roles get every forward transition except the
  // customer-only Cancelled path stays available to them too.
  return BOOKING_TRANSITIONS[from];
}

/** The single next forward-progress status, if any (excludes Cancelled/Declined/NoShow side-exits). */
export function nextForwardStatus(from: BookingStatus): BookingStatus | null {
  const forward = BOOKING_TRANSITIONS[from].filter(
    (s) => s !== 'Cancelled' && s !== 'Declined' && s !== 'NoShow',
  );
  return forward[0] ?? null;
}

export type BookingStatusHistoryEntry = {
  status: BookingStatus;
  at: FirestoreDate;
  byUid: string;
  byRole: 'customer' | 'branch_staff' | 'business_owner' | 'business_admin' | 'master_admin';
  note?: string;
};

export type BookingPart = {
  inventoryItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type Booking = {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  businessId: string;
  branchId: string;
  branchName: string;
  carId: string;
  carDescription?: string;
  serviceId?: string;
  serviceName: string;
  bookingDate: Timestamp | Date | string;
  status: BookingStatus;
  cost?: number;
  notes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  partsUsed?: BookingPart[];
  acceptedAt?: FirestoreDate;
  acceptedBy?: string;
  declinedAt?: FirestoreDate;
  declinedReason?: string;
  expiresAt?: FirestoreDate;
  statusHistory: BookingStatusHistoryEntry[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

// ─── Business & Branch (replaces the old single-location Vendor) ────────────

export type BusinessType = 'Garage' | 'Parts Store' | 'Both';
export type BusinessStatus = 'Active' | 'Suspended';
export type KycStatus = 'Pending' | 'Verified' | 'Rejected';

export type BusinessKyc = {
  status: KycStatus;
  crNumber?: string;
  licenseNumber?: string;
  bankName?: string;
  ibanLast4?: string;
  documentPaths?: string[];
  submittedAt?: FirestoreDate;
  reviewedAt?: FirestoreDate;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type Business = {
  legalName: string;
  displayName: string;
  ownerId: string;
  type: BusinessType;
  status: BusinessStatus;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  logoUrl?: string;
  kyc: BusinessKyc;
  commissionRateBps: number;
  branchCount: number;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type BranchStatus = 'Pending Approval' | 'Approved' | 'Rejected';

export type DaySchedule = { isOpen: boolean; openTime: string; closeTime: string };
export type WorkingHours = Record<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat', DaySchedule>;

export type Branch = {
  businessId: string;
  name: string;
  status: BranchStatus;
  isListed: boolean;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  geoHash?: string;
  phoneNumber: string;
  workingHours?: WorkingHours;
  vacationMode: boolean;
  rating?: number;
  reviewCount?: number;
  completedBookingsCount?: number;
  startingPriceValue?: number;
  responseTimeMins?: number;
  pickupAvailable?: boolean;
  warranty?: string;
  tags?: string[];
  imageUrl?: string;
  imageId?: string;
  approvedAt?: FirestoreDate;
  approvedBy?: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

// ─── Membership (staff/auth link) ────────────────────────────────────────────

export type MembershipRole = 'business_owner' | 'business_admin' | 'branch_manager' | 'branch_staff';
export type MembershipStatus = 'Active' | 'Inactive';

export type Membership = {
  userId: string;
  businessId: string;
  role: MembershipRole;
  jobTitle?: string;
  // Empty array means "all branches" — only meaningful for owner/admin roles;
  // branch_manager/branch_staff must have at least one explicit branch.
  branchIds: string[];
  status: MembershipStatus;
  email: string;
  displayName: string;
  phoneNumber?: string;
  invitedBy: string;
  invitedAt: FirestoreDate;
  acceptedAt?: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type StaffInviteStatus = 'Pending' | 'Accepted' | 'Expired' | 'Revoked';

export type StaffInvite = {
  businessId: string;
  branchIds: string[];
  email: string;
  role: MembershipRole;
  jobTitle?: string;
  tokenHash: string;
  status: StaffInviteStatus;
  expiresAt: FirestoreDate;
  createdBy: string;
  createdAt: FirestoreDate;
};

export type UserProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  notificationPreferences?: {
    bookingConfirmations?: boolean;
    serviceReminders?: boolean;
    promotionalOffers?: boolean;
  };
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

// ─── Branch Sub-Entity Types (flat collections, businessId + branchId FKs) ───
// Closes TD-010 (deeply-nested vendors/{vid}/{sub} subcollections) while
// adding the branch dimension in the same pass, per the Phase 1 plan.

export type Service = {
  businessId: string;
  branchId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category?: string;
  active: boolean;
};

export type InventoryItem = {
  businessId: string;
  branchId: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  supplier: string;
};

export type PromotionStatus = 'Active' | 'Expired' | 'Scheduled';

export type Promotion = {
  businessId: string;
  // Empty array = applies to all branches of the business.
  branchIds: string[];
  title: string;
  description: string;
  code: string;
  discount: string;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
};

export type Review = {
  businessId: string;
  branchId: string;
  bookingId: string;
  userId: string;
  customerName: string;
  rating: number;
  comment: string;
  service: string;
  date: string;
  vendorReply?: string;
  vendorReplyDate?: string;
};

// ─── AI Response Types ────────────────────────────────────────────────────────

export type DiagnoseResult = {
  diagnosis: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  potentialCauses: string[];
  recommendedServices: string[];
  disclaimer: string;
};

export type MaintenancePredictionResult = {
  predictedMaintenanceNeeds: string;
  confidenceLevel: string;
};

export type VinDetailsResult = {
  make: string;
  model: string;
  year: number;
};

export type ServiceSummaryResult = {
  summary: string;
  potentialIssues: string;
};

export type BusinessInsightsResult = {
  forecast: string;
  trendingServices: string[];
  customerSentiment: string;
  optimizationTip: string;
};

// ─── API Response Envelope ────────────────────────────────────────────────────

export type ApiSuccess<T> = { data: T; error?: never };
export type ApiError = { error: string; details?: unknown; data?: never };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
