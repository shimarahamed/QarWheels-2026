import type { Car, Booking, Garage } from "./types";

export const mockCars: Car[] = [
  {
    id: "car-1",
    userId: "user-1",
    vin: "JN1AZ00Z000000001",
    make: "Toyota",
    model: "Land Cruiser",
    year: 2022,
    mileage: 45000,
    imageId: "car-placeholder-2",
    serviceHistory: [
      { id: "hist-1-1", date: "2023-01-15", service: "Oil Change", description: "Standard 5W-30 synthetic oil.", cost: 350 },
      { id: "hist-1-2", date: "2023-07-20", service: "Brake Pad Replacement", description: "Replaced front brake pads.", cost: 800 },
      { id: "hist-1-3", date: "2024-01-10", service: "Full Inspection", description: "Comprehensive vehicle check-up.", cost: 500 },
    ],
  },
  {
    id: "car-2",
    userId: "user-1",
    vin: "SALVA20A000000002",
    make: "Nissan",
    model: "Patrol",
    year: 2023,
    mileage: 15000,
    imageId: "car-placeholder-1",
    serviceHistory: [
      { id: "hist-2-1", date: "2023-10-05", service: "First Service (10,000km)", description: "Oil and filter change, tire rotation.", cost: 450 },
    ],
  },
];

export const mockBookings: Booking[] = [
  { id: "booking-1", carId: "car-1", garageName: "Precision Auto Qatar", serviceType: "AC Check & Recharge", date: "2024-08-15T10:00:00Z", status: "Confirmed" },
  { id: "booking-2", carId: "car-2", garageName: "Doha Car Experts", serviceType: "Wheel Alignment", date: "2024-08-20T14:30:00Z", status: "Confirmed" },
  { id: "booking-3", carId: "car-1", garageName: "German Auto Specialists", serviceType: "Full Inspection", date: "2024-06-01T09:00:00Z", status: "Completed", cost: 500 },
  { id: "booking-4", carId: "car-1", garageName: "Quick Lube Center", serviceType: "Oil Change", date: "2024-03-12T11:00:00Z", status: "Completed", cost: 350 },
  { id: "booking-5", carId: "car-2", garageName: "Precision Auto Qatar", serviceType: "Window Tinting", date: "2024-05-25T13:00:00Z", status: "Cancelled" },
];

export const mockGarages: Garage[] = [
    { id: "garage-1", name: "Precision Auto Qatar", address: "Street 10, Industrial Area, Doha", rating: 4.8, reviewCount: 125, services: ["Engine Repair", "Brake Service", "AC Repair", "Full Detailing"], imageId: "garage-interior" },
    { id: "garage-2", name: "Doha Car Experts", address: "Salwa Road, Doha", rating: 4.5, reviewCount: 88, services: ["Oil Change", "Tire Alignment", "Diagnostics"], imageId: "garage-exterior" },
    { id: "garage-3", name: "German Auto Specialists", address: "Barwa Village, Al Wakrah", rating: 4.9, reviewCount: 210, services: ["BMW Service", "Mercedes Service", "Audi Service"], imageId: "garage-interior-2" },
    { id: "garage-4", name: "Quick Lube Center", address: "C Ring Road, Doha", rating: 4.2, reviewCount: 350, services: ["Quick Oil Change", "Filter Replacement"], imageId: "garage-exterior-2" },
];
