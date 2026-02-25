import type { Booking, Garage, User } from "./types";

export const mockBookings: Booking[] = [
  { id: "booking-1", carId: "car-1", garageName: "Precision Auto Qatar", serviceType: "AC Check & Recharge", date: "2024-08-15T10:00:00Z", status: "Confirmed" },
  { id: "booking-2", carId: "car-2", garageName: "Doha Car Experts", serviceType: "Wheel Alignment", date: "2024-08-20T14:30:00Z", status: "Confirmed" },
  { id: "booking-3", carId: "car-1", garageName: "German Auto Specialists", serviceType: "Full Inspection", date: "2024-06-01T09:00:00Z", status: "Completed", cost: 500 },
  { id: "booking-4", carId: "car-1", garageName: "Quick Lube Center", serviceType: "Oil Change", date: "2024-03-12T11:00:00Z", status: "Completed", cost: 350 },
  { id: "booking-5", carId: "car-2", garageName: "Precision Auto Qatar", serviceType: "Window Tinting", date: "2024-05-25T13:00:00Z", status: "Cancelled" },
];

export const mockGarages: Garage[] = [
    { id: "garage-1", name: "Precision Auto Qatar", address: "Street 10, Industrial Area, Doha", rating: 4.8, reviewCount: 125, services: ["Engine Repair", "Brake Service", "AC Repair", "Full Detailing"], imageId: "garage-interior", lat: 25.21, lng: 51.48 },
    { id: "garage-2", name: "Doha Car Experts", address: "Salwa Road, Doha", rating: 4.5, reviewCount: 88, services: ["Oil Change", "Tire Alignment", "Diagnostics"], imageId: "garage-exterior", lat: 25.25, lng: 51.47 },
    { id: "garage-3", name: "German Auto Specialists", address: "Barwa Village, Al Wakrah", rating: 4.9, reviewCount: 210, services: ["BMW Service", "Mercedes Service", "Audi Service"], imageId: "garage-interior-2", lat: 25.17, lng: 51.55 },
    { id: "garage-4", name: "Quick Lube Center", address: "C Ring Road, Doha", rating: 4.2, reviewCount: 350, services: ["Quick Oil Change", "Filter Replacement"], imageId: "garage-exterior-2", lat: 25.28, lng: 51.51 },
];

export const mockUser: User = {
  id: "user-1",
  name: "Saleh Al-Mansoori",
  email: "saleh.almansoori@example.com",
  phone: "+974 5555 1234",
  avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Saleh Al-Mansoori`,
  notificationPreferences: {
    bookingConfirmations: true,
    serviceReminders: true,
    promotionalOffers: false,
  },
};
