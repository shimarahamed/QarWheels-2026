import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceServices, marketplaceSource } from './marketplace-source';
import { firestore } from './firebase';
import { useQarWheelStore } from './store';
import { useAuthContext } from './AuthContext';
import type { Booking, Garage, PopularJob } from './marketplace';
import type { BookingWorkflowStatus } from './booking-workflow';
import { haversineKm, useDeviceLocation, type DeviceLocation } from './geo';
import { vehicleCreateSchema } from './validation';
import { recordedHealth } from './vehicle-records';
import { canAccess, isBusinessWideRole } from './permissions';
import { apiPost } from './api';
import { isBookingQuote } from './booking-quote';

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

function customerBookingFromDocument(id: string, data: Record<string, any>): Booking {
  return {
    id,
    garage: data.branchName ?? data.vendorName ?? '',
    garageId: data.branchId ?? data.vendorId ?? '',
    service: data.serviceName ?? '',
    vehicle: data.carDescription ?? data.carName ?? '',
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
}

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
  health?: number;
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
    branchId: string;
    carId: string;
    serviceId: string;
    bookingDate: string;
    timeSlot?: string;
    notes?: string;
    idempotencyKey: string;
  },
) : Promise<{ id: string }> {
  if (!userId || !input.branchId || !input.carId || !input.serviceId || !input.idempotencyKey) {
    throw new Error('Choose a saved vehicle and an available garage service.');
  }
  const currentUser = getAuth().currentUser;
  if (!currentUser || currentUser.uid !== userId) throw new Error('Sign in again before sending a booking request.');
  return apiPost<{ id: string }>('/api/bookings', await currentUser.getIdToken(), input);
}

export async function cancelBooking(bookingId: string) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Sign in before cancelling a booking');
  const ref = doc(firestore, 'bookings', bookingId);
  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Booking not found');
    const booking = snapshot.data();
    if (['Completed', 'Cancelled', 'Declined', 'NoShow'].includes(booking.status)) {
      throw new Error('This booking can no longer be cancelled');
    }
    transaction.update(ref, {
      status: 'Cancelled',
      statusHistory: [
        ...(booking.statusHistory ?? []),
        { status: 'Cancelled', at: new Date(), byUid: uid, byRole: 'customer' },
      ],
      updatedAt: serverTimestamp(),
    });
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
  if (!userId) throw new Error('Sign in before adding a vehicle.');
  const parsed = vehicleCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check the vehicle details.');
  const health = recordedHealth(input);
  return addDoc(collection(firestore, 'users', userId, 'cars'), {
    userId,
    ...parsed.data,
    ...(health === null ? {} : { health }),
    dataSource: input.dataSource ?? 'manual',
    ...(input.obdDiagnostics?.simulationMode === false ? { obdDiagnostics: input.obdDiagnostics } : {}),
    ...(input.smartcarConnected ? { smartcarConnected: true } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCar(userId: string, carId: string) {
  return deleteDoc(doc(firestore, 'users', userId, 'cars', carId));
}

/**
 * Real-time list of the signed-in user's cars. Replaces what used to be two
 * separate inline `onSnapshot` subscriptions to the same
 * `users/{uid}/cars` collection in CarsScreen and AccountScreen
 * (components/Marketplace.tsx) — one shared hook instead of two copies that
 * could drift.
 */
export function useCars(userId: string | null | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    userId: string | null; cars: FirestoreCar[]; isLoading: boolean; error: boolean;
  }>({ userId: null, cars: [], isLoading: true, error: false });

  useEffect(() => {
    if (!userId) {
      setResult({ userId: null, cars: [], isLoading: false, error: false });
      return;
    }
    let active = true;
    setResult((previous) => ({ userId, cars: previous.userId === userId ? previous.cars : [], isLoading: true, error: false }));
    const deadline = setTimeout(() => {
      if (active) setResult((previous) => ({ ...previous, isLoading: false, error: true }));
    }, 15_000);
    const q = query(collection(firestore, 'users', userId, 'cars'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        clearTimeout(deadline);
        setResult({ userId, cars: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FirestoreCar, 'id'>) })), isLoading: false, error: false });
      },
      () => {
        if (!active) return;
        clearTimeout(deadline);
        setResult((previous) => ({ ...previous, isLoading: false, error: true }));
      },
    );
    return () => { active = false; clearTimeout(deadline); unsub(); };
  }, [userId, attempt]);

  return {
    cars: result.userId === (userId ?? null) ? result.cars : [],
    isLoading: result.userId !== (userId ?? null) || result.isLoading,
    error: result.userId === (userId ?? null) && result.error,
    refresh: () => setAttempt((value) => value + 1),
  };
}

/**
 * Sets which car is the user's default vehicle. Stored on the user's own
 * profile doc (users/{uid}.defaultCarId) rather than a flag on each car doc —
 * "default" is a single-valued preference of the user, not a property of the
 * vehicle, so this avoids needing a batched unset-elsewhere-on-set write.
 */
export async function setDefaultCar(userId: string, carId: string) {
  return setDoc(doc(firestore, 'users', userId), { defaultCarId: carId, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Notification preferences ──────────────────────────────────────
// Mirrors the web app's UserProfile.notificationPreferences shape exactly
// (src/lib/types.ts) so the same users/{uid} field means the same thing on
// both platforms.

export type NotificationPreferences = {
  bookingConfirmations: boolean;
  serviceReminders: boolean;
  promotionalOffers: boolean;
};

export async function saveNotificationPreferences(userId: string, prefs: NotificationPreferences) {
  return setDoc(
    doc(firestore, 'users', userId),
    { notificationPreferences: prefs, updatedAt: serverTimestamp() },
    { merge: true },
  );
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
  const booking = await getDoc(doc(firestore, 'bookings', review.bookingId));
  if (!booking.exists() || booking.data().status !== 'Completed' || booking.data().userId !== review.userId) {
    throw new Error('Only your completed bookings can be reviewed');
  }
  await setDoc(doc(firestore, 'reviews', review.bookingId), {
    bookingId: review.bookingId,
    businessId: booking.data().businessId,
    branchId: booking.data().branchId,
    userId: review.userId,
    rating: review.rating,
    comment: review.comment,
    service: review.serviceLabel,
    customerName: getAuth().currentUser?.displayName ?? 'QarWheel Customer',
    date: new Date().toISOString(),
    createdAt: serverTimestamp(),
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
  const pageSize = 50;
  const mergeFirestoreBookings = useQarWheelStore((s) => s.mergeFirestoreBookings);
  const [attempt, setAttempt] = useState(0);
  const [requestedPage, setRequestedPage] = useState({ userId: null as string | null, size: pageSize });
  const requestedSize = requestedPage.userId === userId ? requestedPage.size : pageSize;
  const [result, setResult] = useState<{ userId: string | null; bookings: Booking[]; loading: boolean; loadingMore: boolean; hasMore: boolean; error: boolean }>({
    userId: null, bookings: [], loading: true, loadingMore: false, hasMore: false, error: false,
  });

  useEffect(() => {
    if (!userId) {
      setResult({ userId: null, bookings: [], loading: false, loadingMore: false, hasMore: false, error: false });
      return;
    }
    let active = true;
    setResult((previous) => {
      const bookings = previous.userId === userId ? previous.bookings : [];
      const loadingMore = bookings.length > 0 && requestedSize > pageSize && previous.hasMore;
      return { ...previous, userId, bookings, loading: !loadingMore, loadingMore, error: false };
    });
    const timer = setTimeout(() => { if (active) setResult((previous) => ({ ...previous, loading: false, loadingMore: false, error: true })); }, 15_000);

    const q = query(
      collection(firestore, 'bookings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(requestedSize + 1),
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!active) return;
      clearTimeout(timer);
      const firestoreBookings: Booking[] = snap.docs.slice(0, requestedSize)
        .map((d) => customerBookingFromDocument(d.id, d.data()));
      mergeFirestoreBookings(firestoreBookings);
      setResult({ userId, bookings: firestoreBookings, loading: false, loadingMore: false, hasMore: snap.docs.length > requestedSize, error: false });
    }, () => {
      if (!active) return;
      clearTimeout(timer);
      setResult((previous) => ({ ...previous, loading: false, loadingMore: false, error: true }));
    });

    return () => { active = false; clearTimeout(timer); unsub(); };
  }, [userId, mergeFirestoreBookings, attempt, requestedSize]);
  return {
    bookings: result.userId === userId ? result.bookings : [],
    loading: result.userId !== userId || result.loading,
    loadingMore: result.userId === userId && result.loadingMore,
    hasMore: result.userId === userId && result.hasMore,
    error: result.userId === userId && result.error,
    refresh: () => { setRequestedPage({ userId, size: pageSize }); setAttempt((value) => value + 1); },
    loadMore: () => {
      if (userId && result.userId === userId && result.hasMore && !result.loading && !result.loadingMore && !result.error) {
        setRequestedPage({ userId, size: requestedSize + pageSize });
      }
    },
  };
}

export function useBookingDocument(bookingId: string | undefined, userId: string | null) {
  const scope = `${userId ?? ''}:${bookingId ?? ''}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ scope: string; booking: Booking | null; loading: boolean; error: boolean }>({
    scope: '', booking: null, loading: true, error: false,
  });
  useEffect(() => {
    if (!bookingId || !userId) {
      setResult({ scope, booking: null, loading: false, error: false });
      return;
    }
    let active = true;
    setResult({ scope, booking: null, loading: true, error: false });
    const deadline = setTimeout(() => {
      if (active) setResult((previous) => ({ ...previous, loading: false, error: true }));
    }, 15_000);
    const unsubscribe = onSnapshot(doc(firestore, 'bookings', bookingId), (snapshot) => {
      if (!active) return;
      clearTimeout(deadline);
      const data = snapshot.data();
      setResult({
        scope,
        booking: snapshot.exists() && data?.userId === userId ? customerBookingFromDocument(snapshot.id, data) : null,
        loading: false,
        error: false,
      });
    }, () => {
      if (active) { clearTimeout(deadline); setResult({ scope, booking: null, loading: false, error: true }); }
    });
    return () => { active = false; clearTimeout(deadline); unsubscribe(); };
  }, [scope, bookingId, userId, attempt]);
  return {
    booking: result.scope === scope ? result.booking : null,
    loading: result.scope !== scope || result.loading,
    error: result.scope === scope && result.error,
    retry: () => setAttempt((value) => value + 1),
  };
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

/**
 * Maps a `branches/{branchId}` document into the `Garage` shape the mobile UI
 * renders. Branch carries these marketplace fields directly, so this is a
 * straight field read rather than the old cross-collection guesswork.
 */
export function branchToGarage(
  d: { id: string; data: () => Record<string, unknown> },
  deviceLocation: DeviceLocation | null,
): Garage {
  const data = d.data();
  const rawPrice = Number(data.startingPriceValue);
  const startingPriceValue = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  const rawResponse = Number(data.responseTimeMins);
  const responseTimeMins = Number.isFinite(rawResponse) && rawResponse > 0 ? rawResponse : 0;
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
    businessId: String(data.businessId ?? ''),
    name: String(data.name ?? 'Unknown'),
    type: 'Car Service & Repair',
    category: 'Auto repair shop',
    // Branch has no separate `area` field — the address line is the closest
    // real value, and the UI uses `area` only as a sub-title under the name.
    area: String(data.address ?? ''),
    city: String(data.city ?? ''),
    rating: Number(data.rating ?? 0),
    reviews: Number(data.reviewCount ?? 0),
    responseTime: responseTimeMins ? `${responseTimeMins} min` : 'Response time unavailable',
    startingPrice: startingPriceValue ? `QAR ${startingPriceValue}+` : 'Price on request',
    startingPriceValue,
    distanceKm,
    latitude,
    longitude,
    availability: data.availability === 'Now' || data.availability === 'Today' || data.availability === 'Tomorrow'
      ? data.availability : 'On request',
    openNow: typeof data.openNow === 'boolean' ? data.openNow : null,
    // A branch is only listed once an admin has approved it, so anything the
    // marketplace can see is verified by definition.
    verified: true,
    pickupAvailable: Boolean(data.pickupAvailable ?? false),
    warranty: String(data.warranty ?? ''),
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
  };
}

/** Maps a `branch_services/{id}` document into the `PopularJob` UI shape. */
function branchServiceToJob(serviceDoc: { id: string; data: () => Record<string, unknown> }, branchId: string): PopularJob {
  const data = serviceDoc.data();
  const rawPrice = Number(data.price);
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  return {
    id: `${branchId}_${serviceDoc.id}`,
    sourceServiceId: serviceDoc.id,
    title: String(data.name ?? 'Service'),
    price: price ? `QAR ${price}` : 'Price on request',
    priceValue: price,
    availability: data.availability === 'Now' || data.availability === 'Today' || data.availability === 'Tomorrow'
      ? data.availability : 'On request',
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
export function useBranches({ includeServices = false }: { includeServices?: boolean } = {}) {
  const catalog = useSyncExternalStore(marketplaceSource.subscribe, marketplaceSource.getSnapshot, marketplaceSource.getServerSnapshot);
  const { location } = useDeviceLocation();
  const branchIds = useMemo(() => catalog.docs.map((entry) => entry.id).sort(), [catalog.docs]);
  const services = useQuery({
    queryKey: ['marketplace-services', branchIds],
    queryFn: ({ signal }) => fetchMarketplaceServices(branchIds, signal),
    enabled: includeServices && branchIds.length > 0 && !catalog.loading && !catalog.error,
    staleTime: 60_000,
  });
  const vendors = useMemo(() => catalog.docs.map((entry) => branchToGarage(entry, location)), [catalog.docs, location]);
  const jobs = useMemo(() => includeServices
    ? (services.data ?? []).map((entry) => branchServiceToJob(entry, String(entry.data().branchId)))
    : [], [includeServices, services.data]);
  const refresh = async () => {
    await marketplaceSource.retry();
    if (includeServices && branchIds.length) await services.refetch();
  };
  return {
    vendors, jobs,
    loading: catalog.loading || (includeServices && branchIds.length > 0 && !catalog.error && services.isPending),
    error: catalog.error || (includeServices && services.isError),
    refresh,
  };
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

// ── useGarage — a single branch by id, for id-route screens ──────────────────
// (garage/[id], chat/[garageId], garage-reviews/[id], etc.) These previously
// read the static `lookupGarage()` seed lookup; a stale/deleted id now
// resolves to `garage: null` (screens already render a "not found" state for
// that) instead of silently falling back to another garage's data.

const garageDocCache = new Map<string, Garage>();

export function useGarage(branchId: string | undefined): { garage: Garage | null; loading: boolean } {
  const [garage, setGarage] = useState<Garage | null>(branchId ? garageDocCache.get(branchId) ?? null : null);
  const [loading, setLoading] = useState(!garage);
  const { location } = useDeviceLocation();

  useEffect(() => {
    if (!branchId) { setGarage(null); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    getDoc(doc(firestore, 'branches', branchId))
      .then((snap: DocumentSnapshot) => {
        if (cancelled) return;
        if (!snap.exists()) { setGarage(null); return; }
        const mapped = branchToGarage({ id: snap.id, data: () => snap.data() ?? {} }, location);
        garageDocCache.set(branchId, mapped);
        setGarage(mapped);
      })
      .catch(() => { if (!cancelled) setGarage(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [branchId, location]);

  return { garage, loading };
}

// ── useVendorBookings — bookings addressed to this vendor ─────────────────────

export function useVendorFirestoreBookings() {
  const mergeVendorBookings = useQarWheelStore((s) => s.mergeVendorFirestoreBookings);
  const activeBranchId = useQarWheelStore((s) => s.activeBranchId);
  const { user, businessId, branchIds, role, claimsLoading } = useAuthContext();
  const vendorRole = role !== 'customer' && role !== 'master_admin' ? role : null;
  const businessWide = vendorRole ? isBusinessWideRole(vendorRole) : false;
  const allowed = Boolean(user && businessId && vendorRole && canAccess(vendorRole, 'bookings') && !claimsLoading);
  const scope = JSON.stringify([user?.uid, businessId, role, activeBranchId, branchIds, claimsLoading]);
  const [result, setResult] = useState({ scope: '', loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    mergeVendorBookings([]);
    if (!allowed || (!businessWide && (!activeBranchId || !branchIds.includes(activeBranchId)))) {
      setResult({ scope, loading: false, error: false });
      return;
    }
    setResult({ scope, loading: true, error: false });
    const constraints = [where('businessId', '==', businessId)];
    if (activeBranchId) constraints.push(where('branchId', '==', activeBranchId));
    const q = query(collection(firestore, 'bookings'), ...constraints);
    const deadline = setTimeout(() => {
      if (active) setResult({ scope, loading: false, error: true });
    }, 15_000);

    const unsub = onSnapshot(q, (snap) => {
      if (!active) return;
      clearTimeout(deadline);
      const bookings = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          branchId: String(data.branchId ?? ''),
          customerName: String(data.customerName ?? data.carName ?? 'Customer'),
          customerId: typeof data.userId === 'string' ? data.userId : undefined,
          customerPhone: String(data.customerPhone ?? ''),
          vehicle: String(data.carDescription ?? data.carName ?? ''),
          vehiclePlate: String(data.vehiclePlate ?? ''),
          service: String(data.serviceName ?? ''),
          serviceCategory: String(data.serviceCategory ?? 'repair'),
          date: (() => {
            try {
              if (!data.bookingDate) return 'Not scheduled';
              const d = new Date(toIsoString(data.bookingDate));
              if (isNaN(d.getTime())) return 'Not scheduled';
              if (d.toLocaleDateString('en-QA', { timeZone: 'Asia/Qatar' }) === new Date().toLocaleDateString('en-QA', { timeZone: 'Asia/Qatar' })) return 'Today';
              return d.toLocaleDateString('en-QA', { weekday: 'short', month: 'short', day: 'numeric' });
            } catch { return 'Not scheduled'; }
          })(),
          bookingDate: data.bookingDate ? toIsoString(data.bookingDate) : undefined,
          timeSlot: (() => {
            if (data.timeSlot) return String(data.timeSlot);
            if (!data.bookingDate) return '';
            const date = new Date(toIsoString(data.bookingDate));
            return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-QA', { timeZone: 'Asia/Qatar', hour: '2-digit', minute: '2-digit' });
          })(),
          status: (data.status ?? 'Pending') as BookingWorkflowStatus,
          notes: data.notes ? String(data.notes) : '',
          pickupEnabled: Boolean(data.pickupEnabled),
          dropoffEnabled: Boolean(data.dropoffEnabled),
          address: data.address ? String(data.address) : '',
          paymentMethod: data.paymentMethod ? String(data.paymentMethod) : 'Pay at garage',
          addOns: Array.isArray(data.addOns) ? (data.addOns as unknown[]).filter((x) => x != null).map(String) : [],
          staffId: data.assignedStaffId ? String(data.assignedStaffId) : '',
          staffName: data.assignedStaffName ? String(data.assignedStaffName) : '',
          totalAmount: Number(data.cost ?? 0),
          requiresQuote: Boolean(data.requiresQuote),
          acceptedQuoteAmountMinorUnits: isBookingQuote(data.quote) && data.quote.status === 'Accepted'
            ? data.quote.amountMinorUnits : undefined,
          invoiceId: data.invoiceId ? String(data.invoiceId) : '',
          chatId: `chat_${d.id}`,
          createdAt: toIsoString(data.createdAt) || new Date().toISOString(),
        };
      });
      bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      mergeVendorBookings(bookings);
      setResult({ scope, loading: false, error: false });
    }, () => {
      if (!active) return;
      clearTimeout(deadline);
      mergeVendorBookings([]);
      setResult({ scope, loading: false, error: true });
    });

    return () => { active = false; clearTimeout(deadline); unsub(); };
  }, [scope, allowed, businessWide, businessId, activeBranchId, mergeVendorBookings, attempt]);
  return { loading: result.scope !== scope || result.loading, error: result.scope === scope && result.error, retry: () => setAttempt((value) => value + 1) };
}
