import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { firestore } from './firebase';
import { useQarWheelStore } from './store';
import { useAuthContext } from './AuthContext';
import type { Booking, Garage, PopularJob } from './marketplace';
import type { BookingWorkflowStatus } from './booking-workflow';
import { haversineKm, useDeviceLocation, type DeviceLocation } from './geo';

// ── Types ─────────────────────────────────────────────────────────

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export type FirestoreBooking = {
  id: string;
  userId: string;
  vendorId: string;
  vendorName: string;
  carId: string;
  carName: string;
  serviceName: string;
  bookingDate: string;
  status: BookingStatus;
  cost?: number;
  notes?: string;
};

export type ObdDiagnostics = {
  scannedAt: string;        // ISO timestamp
  simulationMode: boolean;
  faultCodes: { code: string; description: string; severity: string }[];
  engineRpm: number | null;
  vehicleSpeed: number | null;
  coolantTemp: number | null;
  batteryVoltage: number | null;
  fuelLevel: number | null;
  throttlePosition: number | null;
  oilTemp: number | null;
  intakeAirTemp: number | null;
  engineLoad: number | null;
};

export type FirestoreCar = {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  color: string;
  currentMileage: number;
  health: number;
  nextServiceDate?: string;
  imageUrl?: string;
  obdDiagnostics?: ObdDiagnostics;
  smartcarConnected?: boolean;
  dataSource?: 'manual' | 'obd' | 'smartcar';
};

// ── Booking operations ────────────────────────────────────────────

export async function createBooking(
  userId: string,
  input: {
    customerName: string;
    customerEmail: string;
    vendorId: string;
    vendorName: string;
    carId: string;
    carName: string;
    serviceName: string;
    bookingDate?: string;
    cost?: number;
    notes?: string;
  },
) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return addDoc(collection(firestore, 'bookings'), {
    userId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    carId: input.carId,
    carName: input.carName,
    carDescription: input.carName,
    serviceName: input.serviceName,
    bookingDate: input.bookingDate ?? tomorrow.toISOString(),
    status: 'Pending',
    cost: input.cost ?? 0,
    notes: input.notes ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelBooking(bookingId: string) {
  return updateDoc(doc(firestore, 'bookings', bookingId), {
    status: 'Cancelled',
    updatedAt: serverTimestamp(),
  });
}

// ── Car operations ────────────────────────────────────────────────

export async function addCar(
  userId: string,
  input: {
    make: string;
    model: string;
    year: number;
    vin: string;
    licensePlate: string;
    color: string;
    currentMileage: number;
    health?: number;
    obdDiagnostics?: ObdDiagnostics;
    smartcarConnected?: boolean;
    dataSource?: 'manual' | 'obd' | 'smartcar';
  },
) {
  return addDoc(collection(firestore, 'users', userId, 'cars'), {
    userId,
    make: input.make,
    model: input.model,
    year: input.year,
    vin: input.vin,
    licensePlate: input.licensePlate,
    color: input.color,
    currentMileage: input.currentMileage,
    health: input.health ?? 90,
    dataSource: input.dataSource ?? 'manual',
    ...(input.obdDiagnostics ? { obdDiagnostics: input.obdDiagnostics } : {}),
    ...(input.smartcarConnected ? { smartcarConnected: true } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCar(userId: string, carId: string) {
  return deleteDoc(doc(firestore, 'users', userId, 'cars', carId));
}

// ── User profile operations ───────────────────────────────────────

export async function createUserProfile(
  userId: string,
  data: { email: string; firstName: string; lastName: string; phone?: string },
) {
  return setDoc(
    doc(firestore, 'users', userId),
    {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.phone ? { phone: data.phone } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ── Vendor Firestore operations ───────────────────────────────────

export async function updateVendorBookingStatusInFirestore(
  bookingId: string,
  status: string,
) {
  return updateDoc(doc(firestore, 'bookings', bookingId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function saveReview(review: {
  bookingId: string;
  vendorId: string;
  userId: string;
  rating: number;
  comment: string;
  serviceLabel: string;
  garageName: string;
}) {
  await addDoc(collection(firestore, 'reviews'), {
    ...review,
    createdAt: serverTimestamp(),
  });
  // Update booking to mark it as reviewed
  await updateDoc(doc(firestore, 'bookings', review.bookingId), {
    reviewed: true,
    updatedAt: serverTimestamp(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────

/** Converts any Firestore Timestamp, Date, or string value to an ISO string. */
function toIsoString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    // Firestore Timestamp has .toDate()
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    // Plain Date
    if (value instanceof Date) return value.toISOString();
  }
  return String(value);
}

// ── Real-time sync hooks ──────────────────────────────────────────

/**
 * Subscribes to the authenticated user's Firestore bookings and merges
 * them into the Zustand store in real time. Unmounts cleanly.
 */
export function useFirestoreBookings(userId: string | null) {
  const mergeFirestoreBookings = useQarWheelStore((s) => s.mergeFirestoreBookings);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(firestore, 'bookings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const firestoreBookings: Booking[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          garage: data.vendorName ?? '',
          garageId: data.vendorId ?? '',
          service: data.serviceName ?? '',
          vehicle: data.carName ?? '',
          vehicleId: data.carId,
          date: toIsoString(data.bookingDate),
          bookingDate: toIsoString(data.bookingDate),
          status: (data.status ?? 'Pending') as BookingWorkflowStatus,
          totalAmount: data.cost ?? 0,
          notes: data.notes ? String(data.notes) : undefined,
          vendorBookingId: data.vendorBookingId ? String(data.vendorBookingId) : undefined,
          timeSlot: data.timeSlot ? String(data.timeSlot) : undefined,
          paymentMethod: data.paymentMethod ? String(data.paymentMethod) : undefined,
        };
      });
      mergeFirestoreBookings(firestoreBookings);
    });

    return unsub;
  }, [userId, mergeFirestoreBookings]);
}

// ── Business / branch document types ─────────────────────────────────────────
// Mirrors the `Business`, `Branch` and `Service` types in src/lib/types.ts.
// Mobile has no build-time link to src/, so these are kept in sync by hand —
// same reasoning as mobile/lib/roles.ts duplicating the claims shape.

/** Business-level fields a vendor can edit about themselves. */
export type FirestoreBusinessProfile = {
  displayName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  logoUrl?: string;
};

/** Branch-level (per-location) fields a vendor can edit about themselves. */
export type FirestoreBranchProfile = {
  name: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
  vacationMode: boolean;
  workingHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
  rating: number;
  reviewCount: number;
  startingPriceValue: number;
  responseTimeMins: number;
  pickupAvailable: boolean;
  warranty: string;
  tags: string[];
  imageUrl: string;
};

/** A row of the flattened `branch_services` collection. */
export type FirestoreBranchService = {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category?: string;
  active: boolean;
};

// ── Save / update the signed-in vendor's own profile ──────────────────────────
// The target ids come from the caller's own claims (see useVendorProfileWriter
// below), never from a caller-supplied parameter — a client must not be able to
// name which business/branch it writes to. Mirrors the web vendor settings page
// (src/app/vendor/dashboard/settings/page.tsx), which splits the same form
// across businesses/{businessId} and branches/{branchId}.

async function saveBusinessProfile(businessId: string, data: Partial<FirestoreBusinessProfile>) {
  return setDoc(
    doc(firestore, 'businesses', businessId),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

async function saveBranchProfile(branchId: string, data: Partial<FirestoreBranchProfile>) {
  return setDoc(
    doc(firestore, 'branches', branchId),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Returns writers scoped to the signed-in vendor's own business and active
 * branch. Both resolve their target id from claims/active-branch state, so a
 * screen can only ever edit the tenant it is actually a member of. When the
 * user has no vendor claim the writers are no-ops that reject, rather than
 * silently writing somewhere unexpected.
 */
export function useVendorProfileWriter() {
  const { businessId } = useAuthContext();
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);

  return {
    businessId,
    branchId: activeBranchId,
    /** Business-level fields (display name, contact details). */
    async saveBusiness(data: Partial<FirestoreBusinessProfile>) {
      if (!businessId) throw new Error('No business in scope for the signed-in user.');
      return saveBusinessProfile(businessId, data);
    },
    /** Location-level fields (hours, address, vacation mode). */
    async saveBranch(data: Partial<FirestoreBranchProfile>) {
      if (!activeBranchId) throw new Error('No active branch in scope for the signed-in user.');
      return saveBranchProfile(activeBranchId, data);
    },
  };
}

// ── useVendorServiceWriter — create/edit rows in `branch_services` ────────────
// Mirrors src/app/vendor/dashboard/services/page.tsx: a create stamps the
// businessId/branchId FKs from the caller's own scope; an edit patches the
// flat doc by id.

export function useVendorServiceWriter() {
  const { businessId } = useAuthContext();
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);

  return {
    async createService(service: Omit<FirestoreBranchService, 'id' | 'businessId' | 'branchId'>) {
      if (!businessId || !activeBranchId) {
        throw new Error('No business/branch in scope for the signed-in user.');
      }
      return addDoc(collection(firestore, 'branch_services'), {
        ...service,
        businessId,
        branchId: activeBranchId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    async updateService(serviceId: string, patch: Partial<Omit<FirestoreBranchService, 'id' | 'businessId' | 'branchId'>>) {
      return updateDoc(doc(firestore, 'branch_services', serviceId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },
  };
}

// ── useBranches — real-time list of listed branches for the marketplace ───────

const FALLBACK_GARAGE_IMAGE =
  'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=900&q=80';

/**
 * Maps a `branches/{branchId}` document into the `Garage` shape the mobile UI
 * renders. Branch carries these marketplace fields directly, so this is a
 * straight field read rather than the old cross-collection guesswork.
 */
function branchToGarage(
  d: { id: string; data: () => Record<string, unknown> },
  deviceLocation: DeviceLocation | null,
): Garage {
  const data = d.data();
  const startingPriceValue = Number(data.startingPriceValue ?? 100);
  const responseTimeMins = Number(data.responseTimeMins ?? 15);
  const latitude = typeof data.latitude === 'number' ? data.latitude : undefined;
  const longitude = typeof data.longitude === 'number' ? data.longitude : undefined;
  // 0 means "unknown", not "you're standing here" — only a real device fix
  // against real branch coordinates produces a non-zero value. No fake
  // placeholder distance, matching the rest of the marketplace's honesty
  // standard post-Phase-1.
  const distanceKm = deviceLocation && latitude !== undefined && longitude !== undefined
    ? haversineKm(deviceLocation.latitude, deviceLocation.longitude, latitude, longitude)
    : 0;
  return {
    id: d.id,
    name: String(data.name ?? 'Unknown'),
    type: 'Car Service & Repair',
    category: 'Auto repair shop',
    // Branch has no separate `area` field — the address line is the closest
    // real value, and the UI uses `area` only as a sub-title under the name.
    area: String(data.address ?? ''),
    city: String(data.city ?? 'Doha'),
    rating: Number(data.rating ?? 0),
    reviews: Number(data.reviewCount ?? 0),
    responseTime: `${responseTimeMins} min`,
    startingPrice: `QAR ${startingPriceValue}+`,
    startingPriceValue,
    distanceKm,
    latitude,
    longitude,
    availability: 'Today',
    openNow: !data.vacationMode,
    // A branch is only listed once an admin has approved it, so anything the
    // marketplace can see is verified by definition.
    verified: true,
    pickupAvailable: Boolean(data.pickupAvailable ?? false),
    warranty: String(data.warranty ?? ''),
    imageUrl: String(data.imageUrl ?? FALLBACK_GARAGE_IMAGE),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
  };
}

/** Maps a `branch_services/{id}` document into the `PopularJob` UI shape. */
function branchServiceToJob(serviceDoc: { id: string; data: () => Record<string, unknown> }, branchId: string): PopularJob {
  const data = serviceDoc.data();
  const price = Number(data.price ?? 0);
  return {
    id: `${branchId}_${serviceDoc.id}`,
    title: String(data.name ?? 'Service'),
    price: `QAR ${price}`,
    priceValue: price,
    availability: 'Today',
    categoryId: String(data.category ?? 'repair'),
    garageId: branchId,
    duration: data.duration ? `${data.duration} min` : undefined,
    rating: undefined,
    distanceKm: undefined,
  };
}

/**
 * Real-time list of the branches a customer may browse, plus their bookable
 * services. Branches are the marketplace unit (a business with three garages
 * shows as three listings), matching the web marketplace in
 * src/app/dashboard/garages/page.tsx.
 *
 * distanceKm on each returned Garage is computed against the device's
 * current location (see lib/geo.ts) when a fix is available, 0 otherwise —
 * kept as a separate re-map step from the Firestore listener itself so a
 * location update doesn't tear down and re-attach the snapshot subscription.
 */
export function useBranches(): { vendors: Garage[]; jobs: PopularJob[]; loading: boolean } {
  const [rawDocs, setRawDocs] = useState<QueryDocumentSnapshot[]>([]);
  const [jobs, setJobs] = useState<PopularJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { location } = useDeviceLocation();

  const vendors = useMemo(
    () => rawDocs.map((d) => branchToGarage(d, location)),
    [rawDocs, location],
  );

  useEffect(() => {
    // Only admin-approved branches are visible to customers — same query the
    // web marketplace uses, and the same condition firestore.rules enforces
    // for non-owner/non-admin readers. `isListed` (admin delist switch) and
    // `vacationMode` (the vendor's own pause) are then applied client-side so
    // this needs no extra composite index.
    const q = query(collection(firestore, 'branches'), where('status', '==', 'Approved'));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const listedDocs = snap.docs.filter((d) => {
          const data = d.data();
          return data.isListed !== false && !data.vacationMode;
        });

        if (listedDocs.length === 0) {
          setRawDocs([]);
          setJobs([]);
          setLoading(false);
          return;
        }
        setRawDocs(listedDocs);

        // Load the bookable services for each listed branch.
        const allJobs: PopularJob[] = [];
        await Promise.all(
          listedDocs.map(async (branchDoc) => {
            try {
              const serviceSnap = await getDocs(
                query(
                  collection(firestore, 'branch_services'),
                  where('branchId', '==', branchDoc.id),
                  where('active', '==', true),
                ),
              );
              serviceSnap.docs.forEach((sDoc) => {
                allJobs.push(branchServiceToJob(sDoc, branchDoc.id));
              });
            } catch { /* branch has no services yet */ }
          }),
        );
        setJobs(allJobs);
        setLoading(false);
      },
      () => {
        // Firestore unavailable → empty state, not fake data. Screens using
        // this hook should show a retry / offline affordance when vendors is
        // empty and loading is false.
        setRawDocs([]);
        setJobs([]);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { vendors, jobs, loading };
}

// ── useBranchServices — bookable services for a single branch ────────────────

export function useBranchServices(branchId: string): { services: PopularJob[]; loading: boolean } {
  const [services, setServices] = useState<PopularJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) { setLoading(false); return; }

    const q = query(
      collection(firestore, 'branch_services'),
      where('branchId', '==', branchId),
      where('active', '==', true),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        // No seed-data fallback: an empty result is a real empty state, and a
        // read failure is an error state. Showing seeded demo services as if
        // they were this branch's real, bookable menu would let a customer
        // book a service the garage does not offer.
        setServices(snap.docs.map((d) => branchServiceToJob(d, branchId)));
        setLoading(false);
      },
      () => {
        setServices([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [branchId]);

  return { services, loading };
}

// ── useVendorBookings — bookings addressed to this vendor ─────────────────────

export function useVendorFirestoreBookings(vendorId: string | null) {
  const mergeVendorBookings = useQarWheelStore((s) => s.mergeVendorFirestoreBookings);

  useEffect(() => {
    if (!vendorId) return;

    const q = query(
      collection(firestore, 'bookings'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const bookings = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          customerName: String(data.customerName ?? data.carName ?? 'Customer'),
          customerPhone: String(data.customerPhone ?? ''),
          vehicle: String(data.carName ?? ''),
          vehiclePlate: String(data.vehiclePlate ?? ''),
          service: String(data.serviceName ?? ''),
          serviceCategory: String(data.serviceCategory ?? 'repair'),
          date: (() => {
            try {
              if (!data.bookingDate) return 'Today';
              const d = new Date(toIsoString(data.bookingDate));
              if (isNaN(d.getTime())) return 'Today';
              return d.toLocaleDateString('en-QA', { weekday: 'short', month: 'short', day: 'numeric' });
            } catch { return 'Today'; }
          })(),
          timeSlot: String(data.timeSlot ?? ''),
          status: (data.status ?? 'Pending') as BookingWorkflowStatus,
          notes: data.notes ? String(data.notes) : '',
          pickupEnabled: Boolean(data.pickupEnabled),
          dropoffEnabled: Boolean(data.dropoffEnabled),
          address: data.address ? String(data.address) : '',
          paymentMethod: data.paymentMethod ? String(data.paymentMethod) : 'Pay at garage',
          addOns: Array.isArray(data.addOns) ? (data.addOns as unknown[]).filter((x) => x != null).map(String) : [],
          staffId: data.staffId ? String(data.staffId) : '',
          staffName: data.staffName ? String(data.staffName) : '',
          totalAmount: Number(data.cost ?? 0),
          invoiceId: data.invoiceId ? String(data.invoiceId) : '',
          chatId: `chat_${d.id}`,
          createdAt: toIsoString(data.createdAt) || new Date().toISOString(),
        };
      });
      mergeVendorBookings(bookings);
    }, () => { /* offline — keep seed data */ });

    return unsub;
  }, [vendorId, mergeVendorBookings]);
}
