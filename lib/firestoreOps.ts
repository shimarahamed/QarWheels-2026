import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firebase';

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
    health: 90,
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
