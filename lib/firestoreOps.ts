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
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { firestore } from './firebase';
import { useQarWheelsStore } from './store';
import type { Booking, Garage, PopularJob } from './marketplace';
import type { BookingWorkflowStatus } from './booking-workflow';
import { garages as seedGarages, popularJobs as seedJobs } from './marketplace';

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
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    carId: input.carId,
    carName: input.carName,
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
  const mergeFirestoreBookings = useQarWheelsStore((s) => s.mergeFirestoreBookings);

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

// ── Vendor Firestore document type ───────────────────────────────────────────

export type FirestoreVendor = {
  id: string;           // Firestore doc ID = vendor's Firebase Auth UID
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  category: string;
  area: string;
  city: string;
  imageUrl?: string;
  rating: number;
  totalReviews: number;
  verified: boolean;
  openNow: boolean;
  vacationMode: boolean;
  openTime: string;
  closeTime: string;
  workDays: string[];
  startingPrice: string;
  startingPriceValue: number;
  responseTime: string;
  distanceKm?: number;
  pickupAvailable: boolean;
  warranty: string;
  tags: string[];
};

export type FirestoreVendorService = {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number;
  description: string;
  active: boolean;
  warranty?: string;
};

// ── Save / update vendor profile in Firestore ─────────────────────────────────

export async function saveVendorProfile(uid: string, data: Partial<FirestoreVendor>) {
  return setDoc(
    doc(firestore, 'vendors', uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// ── Save vendor service to Firestore subcollection ────────────────────────────

export async function saveVendorService(uid: string, service: Omit<FirestoreVendorService, 'id'>) {
  return addDoc(collection(firestore, 'vendors', uid, 'services'), {
    ...service,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateVendorService(uid: string, serviceId: string, patch: Partial<FirestoreVendorService>) {
  return updateDoc(doc(firestore, 'vendors', uid, 'services', serviceId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

// ── useVendors — real-time list of all vendors for the user-side marketplace ──

function docToGarage(d: { id: string; data: () => Record<string, unknown> }): Garage {
  const data = d.data();
  return {
    id: d.id,
    name: String(data.businessName ?? data.name ?? 'Unknown'),
    type: String(data.category ?? 'Car Service & Repair'),
    category: String(data.category ?? 'Auto repair shop'),
    area: String(data.area ?? ''),
    city: String(data.city ?? 'Doha'),
    rating: Number(data.rating ?? 4.5),
    reviews: Number(data.totalReviews ?? 0),
    responseTime: String(data.responseTime ?? '15 min'),
    startingPrice: String(data.startingPrice ?? 'QAR 100+'),
    startingPriceValue: Number(data.startingPriceValue ?? 100),
    distanceKm: Number(data.distanceKm ?? 5),
    availability: 'Today',
    openNow: Boolean(data.openNow ?? !data.vacationMode),
    verified: Boolean(data.verified ?? false),
    pickupAvailable: Boolean(data.pickupAvailable ?? false),
    warranty: String(data.warranty ?? ''),
    imageUrl: String(data.imageUrl ?? 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=900&q=80'),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
  };
}

function docToJob(serviceDoc: { id: string; data: () => Record<string, unknown> }, vendorId: string, vendorName: string): PopularJob {
  const data = serviceDoc.data();
  return {
    id: `${vendorId}_${serviceDoc.id}`,
    title: String(data.name ?? 'Service'),
    price: `QAR ${data.basePrice ?? 100}`,
    priceValue: Number(data.basePrice ?? 100),
    availability: 'Today',
    categoryId: String(data.category ?? 'repair'),
    garageId: vendorId,
    duration: data.duration ? `${data.duration} min` : undefined,
    warranty: data.warranty ? String(data.warranty) : undefined,
    rating: undefined,
    distanceKm: undefined,
  };
}

export function useVendors(): { vendors: Garage[]; jobs: PopularJob[]; loading: boolean } {
  const [vendors, setVendors] = useState<Garage[]>([]);
  const [jobs, setJobs] = useState<PopularJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener on vendors collection (non-vacation vendors only)
    const q = query(collection(firestore, 'vendors'), where('vacationMode', '==', false));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          // No vendors yet → fall back to seed data
          setVendors(seedGarages);
          setJobs(seedJobs);
          setLoading(false);
          return;
        }
        const liveVendors = snap.docs.map(docToGarage);
        setVendors(liveVendors);

        // Load services for each vendor
        const allJobs: PopularJob[] = [];
        await Promise.all(
          snap.docs.map(async (vDoc) => {
            try {
              const serviceSnap = await getDocs(
                query(collection(firestore, 'vendors', vDoc.id, 'services'), where('active', '==', true)),
              );
              serviceSnap.docs.forEach((sDoc) => {
                allJobs.push(docToJob(sDoc, vDoc.id, String(vDoc.data().businessName ?? '')));
              });
            } catch { /* vendor has no services yet */ }
          }),
        );
        setJobs(allJobs.length > 0 ? allJobs : seedJobs);
        setLoading(false);
      },
      () => {
        // Firestore unavailable → seed fallback
        setVendors(seedGarages);
        setJobs(seedJobs);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  return { vendors, jobs, loading };
}

// ── useVendorServices — services for a single vendor ─────────────────────────

export function useVendorServices(vendorId: string): { services: PopularJob[]; loading: boolean } {
  const [services, setServices] = useState<PopularJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) { setLoading(false); return; }

    // First try as Firestore vendor doc id
    const q = query(
      collection(firestore, 'vendors', vendorId, 'services'),
      where('active', '==', true),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          // Fall back to seed jobs for this garageId
          setServices(seedJobs.filter((j) => j.garageId === vendorId));
        } else {
          setServices(snap.docs.map((d) => docToJob(d, vendorId, '')));
        }
        setLoading(false);
      },
      () => {
        setServices(seedJobs.filter((j) => j.garageId === vendorId));
        setLoading(false);
      },
    );
    return unsub;
  }, [vendorId]);

  return { services, loading };
}

// ── useVendorBookings — bookings addressed to this vendor ─────────────────────

export function useVendorFirestoreBookings(vendorId: string | null) {
  const mergeVendorBookings = useQarWheelsStore((s) => s.mergeVendorFirestoreBookings);

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
