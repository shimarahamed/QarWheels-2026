import { z } from 'zod';

// ─── Shared primitives ────────────────────────────────────────────────────────

export function validateVinChecksum(vin: string): boolean {
  const transliteration: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 17; i += 1) {
    const char = vin[i];
    const value = /\d/.test(char) ? Number(char) : transliteration[char] ?? 0;
    sum += value * weights[i];
  }

  const remainder = sum % 11;
  const checkChar = remainder === 10 ? 'X' : String(remainder);
  return vin[8] === checkChar;
}

export const VinSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .length(17, 'VIN must be exactly 17 characters')
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN contains invalid characters (I, O, Q not allowed)')
      .refine(validateVinChecksum, 'VIN checksum is invalid')
  );

export const QARCurrencySchema = z.number().nonnegative('Amount must be 0 or greater');

export const PhoneSchema = z.string().regex(/^\+?\d{7,15}$/, 'Invalid phone number');

// ─── Car ─────────────────────────────────────────────────────────────────────

export const CarCreateSchema = z.object({
  vin: VinSchema,
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
  licensePlate: z.string().min(1).max(20).optional(),
  color: z.string().max(30).optional(),
  engineType: z.string().max(30).optional(),
  currentMileage: z.number().int().min(0).max(1_000_000),
  purchaseDate: z.string().datetime().optional(),
});
export type CarCreate = z.infer<typeof CarCreateSchema>;

export const MileageUpdateSchema = z.object({
  currentMileage: z.number().int().min(0).max(1_000_000),
});
export type MileageUpdate = z.infer<typeof MileageUpdateSchema>;

// ─── Booking ─────────────────────────────────────────────────────────────────
// Canonical 7+2 state machine — mirrors src/lib/types.ts's BookingStatus /
// BOOKING_TRANSITIONS, which is the single source of truth both apps import.

export const BookingStatusSchema = z.enum([
  'Pending', 'Confirmed', 'VehicleReceived', 'InProgress', 'ReadyForPickup',
  'Completed', 'Declined', 'Cancelled', 'NoShow',
]);

export const BookingCreateSchema = z.object({
  businessId: z.string().min(1).max(128),
  branchId: z.string().min(1).max(128),
  branchName: z.string().min(1).max(100),
  carId: z.string().min(1).max(128),
  serviceId: z.string().min(1).max(128).optional(),
  serviceName: z.string().min(1).max(100),
  bookingDate: z.string().datetime('Invalid booking date'),
  cost: QARCurrencySchema.optional(),
  notes: z.string().max(500).optional(),
});
export type BookingCreate = z.infer<typeof BookingCreateSchema>;

export const BookingTransitionSchema = z.object({
  status: BookingStatusSchema,
  declinedReason: z.string().max(300).optional(),
  cost: QARCurrencySchema.optional(),
});
export type BookingTransition = z.infer<typeof BookingTransitionSchema>;

// ─── Business & Branch ───────────────────────────────────────────────────────

export const BusinessCreateSchema = z.object({
  legalName: z.string().min(2).max(150),
  displayName: z.string().min(2).max(100),
  type: z.enum(['Garage', 'Parts Store', 'Both']),
  contactEmail: z.string().email(),
  contactPhone: PhoneSchema,
  websiteUrl: z.string().url().optional().or(z.literal('')),
});
export type BusinessCreate = z.infer<typeof BusinessCreateSchema>;

export const BranchCreateSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  city: z.string().min(1).max(50),
  country: z.string().min(2).max(50),
  phoneNumber: PhoneSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type BranchCreate = z.infer<typeof BranchCreateSchema>;

// ─── Staff / Membership ───────────────────────────────────────────────────────

export const MembershipRoleSchema = z.enum(['business_owner', 'business_admin', 'branch_manager', 'branch_staff']);

export const StaffInviteCreateSchema = z.object({
  email: z.string().email(),
  role: MembershipRoleSchema,
  jobTitle: z.string().max(50).optional(),
  branchIds: z.array(z.string().min(1)).min(1, 'Select at least one branch'),
});
export type StaffInviteCreate = z.infer<typeof StaffInviteCreateSchema>;

export const StaffInviteAcceptSchema = z.object({
  token: z.string().min(10),
});
export type StaffInviteAccept = z.infer<typeof StaffInviteAcceptSchema>;

// ─── Vendor KYC ────────────────────────────────────────────────────────────────
// Submission-only — status/reviewedAt/reviewedBy are set exclusively by the
// admin approval route (src/app/api/admin/kyc/[businessId]/route.ts), never here.

export const KycSubmitSchema = z.object({
  crNumber: z.string().min(1).max(50),
  licenseNumber: z.string().min(1).max(50),
  bankName: z.string().max(100).optional().or(z.literal('')),
  iban: z.string().min(5).max(34),
  documentUrls: z.array(z.string().url()).max(10).default([]),
});
export type KycSubmit = z.infer<typeof KycSubmitSchema>;

// ─── Review ───────────────────────────────────────────────────────────────────

export const ReviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  service: z.string().max(100).optional(),
});
export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;

// ─── Service Record ───────────────────────────────────────────────────────────

export const ServiceRecordCreateSchema = z.object({
  serviceType: z.string().min(1).max(100),
  serviceDescription: z.string().max(1000).optional(),
  serviceDate: z.string().datetime(),
  mileageAtService: z.number().int().min(0).max(1_000_000),
  cost: QARCurrencySchema,
  vendorId: z.string().max(128).optional(),
  invoiceUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});
export type ServiceRecordCreate = z.infer<typeof ServiceRecordCreateSchema>;

// ─── AI Input Schemas ─────────────────────────────────────────────────────────

export const CarDetailsSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(2030),
  mileage: z.number().int().min(0).max(1_000_000),
});

export const DiagnoseRequestSchema = z.object({
  symptoms: z
    .string()
    .min(10, 'Please describe the problem in at least 10 characters')
    .max(1000, 'Description is too long'),
  carDetails: CarDetailsSchema,
});
export type DiagnoseRequest = z.infer<typeof DiagnoseRequestSchema>;

export const MaintenanceRequestSchema = z.object({
  vin: VinSchema,
  mileage: z.number().int().min(0).max(1_000_000),
  serviceHistory: z.string().max(10_000),
});
export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;

export const VinRequestSchema = z.object({
  vin: VinSchema,
});
export type VinRequest = z.infer<typeof VinRequestSchema>;

export const SummarizeRequestSchema = z.object({
  serviceHistory: z.string().min(1).max(10_000),
  vin: VinSchema,
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(2030),
});
export type SummarizeRequest = z.infer<typeof SummarizeRequestSchema>;

export const InsightsRequestSchema = z.object({
  vendorName: z.string().min(1).max(100),
  bookings: z.array(z.object({
    serviceName: z.string().max(100),
    cost: z.number().nonnegative(),
    status: z.string().max(30),
    date: z.string().max(50),
  })).max(50),
  reviews: z.array(z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000),
  })).max(20).optional(),
});
export type InsightsRequest = z.infer<typeof InsightsRequestSchema>;
