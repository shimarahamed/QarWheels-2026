import type { BookingWorkflowStatus } from '@/lib/booking-workflow';

export type ServiceCategory = {
  id: string;
  label: string;
  count: number;
  icon: string;
};

export type Garage = {
  id: string;
  name: string;
  type: string;
  category: string;
  area: string;
  city: string;
  rating: number;
  reviews: number;
  responseTime: string;
  startingPrice: string;
  startingPriceValue: number;
  distanceKm: number;
  availability: 'Now' | 'Today' | 'Tomorrow';
  openNow: boolean;
  verified: boolean;
  pickupAvailable: boolean;
  warranty: string;
  imageUrl: string;
  tags: string[];
};

export type PopularJob = {
  id: string;
  title: string;
  price: string;
  availability: string;
  categoryId?: string;
  garageId?: string;
  duration?: string;
  warranty?: string;
  priceValue: number;
  rating?: number;
  distanceKm?: number;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  serviceId: string;
  garageId: string;
  discount: string;
  validUntil: string;
};

export type CarProfile = {
  id: string;
  name: string;
  vin: string;
  mileage: string;
  nextService: string;
  health: number;
  plate?: string;
  year?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  insurance?: string;
  lastService?: string;
  serviceHistory?: { label: string; km: string; date: string }[];
};

export type Booking = {
  id: string;
  garage: string;
  garageId?: string;
  service: string;
  serviceId?: string;
  vehicle: string;
  vehicleId?: string;
  vehiclePlate?: string;
  date: string;
  status: BookingWorkflowStatus;
  vendorBookingId?: string;
  bookingDate?: string;
  timeSlot?: string;
  rescheduledAt?: string;
  totalAmount?: number;
  pickupEnabled?: boolean;
  dropoffEnabled?: boolean;
  address?: string;
  notes?: string;
  paymentMethod?: string;
  addOns?: string[];
};

export const serviceCategories: ServiceCategory[] = [
  { id: 'repair', label: 'Repair', count: 84, icon: 'wrench' },
  { id: 'parts', label: 'Parts', count: 38, icon: 'cube' },
  { id: 'wash', label: 'Wash', count: 26, icon: 'car' },
  { id: 'battery', label: 'Battery', count: 19, icon: 'bolt' },
  { id: 'inspection', label: 'Inspection', count: 31, icon: 'shield' },
  { id: 'diagnostics', label: 'Diagnostics', count: 42, icon: 'dashboard' },
];

export const garages: Garage[] = [
  {
    id: 'vendor_aab_toyota',
    name: 'AAB Toyota Main Service Center',
    type: 'Garage',
    category: 'Authorised Toyota service',
    area: 'Street 6, Industrial Area',
    city: 'Doha',
    rating: 4.7,
    reviews: 312,
    responseTime: '20 min',
    startingPrice: 'QAR 180+',
    startingPriceValue: 180,
    distanceKm: 6.8,
    availability: 'Today',
    openNow: true,
    verified: true,
    pickupAvailable: false,
    warranty: 'Factory warranty coverage',
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Toyota', 'Authorised dealer', 'Genuine parts'],
  },
  {
    id: 'vendor_al_mana_ford',
    name: 'Al Mana Ford & Lincoln Service',
    type: 'Garage',
    category: 'Authorised Ford service',
    area: 'Street 23, Industrial Area',
    city: 'Doha',
    rating: 4.6,
    reviews: 245,
    responseTime: '18 min',
    startingPrice: 'QAR 250+',
    startingPriceValue: 250,
    distanceKm: 7.1,
    availability: 'Today',
    openNow: true,
    verified: true,
    pickupAvailable: false,
    warranty: 'Motorcraft parts warranty',
    imageUrl: 'https://images.unsplash.com/photo-1549636367-13c144c47063?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Ford', 'Lincoln', 'Quick lane'],
  },
  {
    id: 'vendor_nissan_service',
    name: 'Nissan Authorised Service Centre',
    type: 'Garage',
    category: 'Authorised Nissan service',
    area: 'Industrial Area',
    city: 'Doha',
    rating: 4.5,
    reviews: 198,
    responseTime: '22 min',
    startingPrice: 'QAR 200+',
    startingPriceValue: 200,
    distanceKm: 6.9,
    availability: 'Tomorrow',
    openNow: true,
    verified: true,
    pickupAvailable: false,
    warranty: 'Genuine Nissan parts',
    imageUrl: 'https://images.unsplash.com/photo-1585014165903-6d6c6ebad3e9?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Nissan', 'Infiniti', 'Diagnostics'],
  },
  {
    id: 'vendor_teyseer',
    name: 'Teyseer Service Centre',
    type: 'Garage',
    category: 'Multi-brand service',
    area: 'Airport Road',
    city: 'Doha',
    rating: 4.8,
    reviews: 489,
    responseTime: '15 min',
    startingPrice: 'QAR 280+',
    startingPriceValue: 280,
    distanceKm: 4.6,
    availability: 'Now',
    openNow: true,
    verified: true,
    pickupAvailable: true,
    warranty: 'Service warranty',
    imageUrl: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Multi-brand', '24-hour service', 'Pickup'],
  },
  {
    id: 'vendor_qauto_vw',
    name: 'Q-Auto Volkswagen & Audi Service',
    type: 'Garage',
    category: 'Authorised VW/Audi service',
    area: 'Street 41, Gate 59',
    city: 'Doha',
    rating: 4.6,
    reviews: 176,
    responseTime: '24 min',
    startingPrice: 'QAR 420+',
    startingPriceValue: 420,
    distanceKm: 7.4,
    availability: 'Today',
    openNow: true,
    verified: true,
    pickupAvailable: false,
    warranty: 'Genuine VAG parts',
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Volkswagen', 'Audi', 'DSG'],
  },
  {
    id: 'garage_011',
    name: 'QSpeedy Auto Garage',
    type: 'Car Service & Repair',
    category: 'Auto repair shop',
    area: 'Building 170 Street 18',
    city: 'Doha',
    rating: 4.9,
    reviews: 260,
    responseTime: '12 min',
    startingPrice: 'QAR 120+',
    startingPriceValue: 120,
    distanceKm: 2.4,
    availability: 'Now',
    openNow: true,
    verified: true,
    pickupAvailable: true,
    warranty: '30-day service warranty',
    imageUrl: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&w=900&q=80',
    tags: ['Approved', 'Top rated', 'Instant booking'],
  },
  {
    id: 'garage_002',
    name: 'CrooZr Auto Center',
    type: 'Spare Parts Store',
    category: 'Repair and maintenance',
    area: 'Gate 20, Street 5',
    city: 'Doha',
    rating: 4.8,
    reviews: 142,
    responseTime: '18 min',
    startingPrice: 'QAR 90+',
    startingPriceValue: 90,
    distanceKm: 3.1,
    availability: 'Today',
    openNow: true,
    verified: true,
    pickupAvailable: true,
    warranty: 'Parts warranty',
    imageUrl: 'https://images.unsplash.com/photo-1549636367-13c144c47063?auto=format&fit=crop&w=900&q=80',
    tags: ['Parts', 'Fast response', 'Pickup'],
  },
  {
    id: 'garage_009',
    name: 'Mega Auto Service',
    type: 'Car Service & Repair',
    category: 'Auto painting',
    area: 'Gate 111, Street 29',
    city: 'Al-Rayyan',
    rating: 4.7,
    reviews: 134,
    responseTime: '22 min',
    startingPrice: 'Quote',
    startingPriceValue: 180,
    distanceKm: 7.8,
    availability: 'Tomorrow',
    openNow: false,
    verified: true,
    pickupAvailable: false,
    warranty: 'Paint and bodywork warranty',
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=900&q=80',
    tags: ['Bodywork', 'Paint', 'Insurance'],
  },
  {
    id: 'garage_006',
    name: 'Auto Genius',
    type: 'Spare Parts Store',
    category: 'Auto restoration service',
    area: 'Al Wakalat Street',
    city: 'Doha',
    rating: 4.6,
    reviews: 65,
    responseTime: '20 min',
    startingPrice: 'QAR 150+',
    startingPriceValue: 150,
    distanceKm: 5.6,
    availability: 'Today',
    openNow: true,
    verified: false,
    pickupAvailable: false,
    warranty: 'Diagnostics report',
    imageUrl: 'https://images.unsplash.com/photo-1585014165903-6d6c6ebad3e9?auto=format&fit=crop&w=900&q=80',
    tags: ['Restoration', 'Diagnostics'],
  },
];

export const popularJobs: PopularJob[] = [
  { id: 'toyota-oil-change', title: 'Toyota Genuine Oil Service', price: 'QAR 380', availability: 'Today', categoryId: 'repair', garageId: 'vendor_aab_toyota', duration: '45 min', warranty: 'Factory record', priceValue: 380, rating: 4.7, distanceKm: 6.8 },
  { id: 'ford-alignment', title: 'Four-Wheel Alignment & Balancing', price: 'QAR 250', availability: 'Today', categoryId: 'repair', garageId: 'vendor_al_mana_ford', duration: '60 min', warranty: 'Motorcraft warranty', priceValue: 250, rating: 4.6, distanceKm: 7.1 },
  { id: 'nissan-ecu-scan', title: 'ECU Diagnostic Scan', price: 'QAR 200', availability: 'Tomorrow', categoryId: 'diagnostics', garageId: 'vendor_nissan_service', duration: '60 min', warranty: 'Diagnostic report', priceValue: 200, rating: 4.5, distanceKm: 6.9 },
  { id: 'tsc-express-oil', title: 'Express Oil & Filter Change', price: 'QAR 280', availability: 'Today', categoryId: 'repair', garageId: 'vendor_teyseer', duration: '30 min', warranty: '10 days', priceValue: 280, rating: 4.8, distanceKm: 4.6 },
  { id: 'vw-dsg-service', title: 'DSG Gearbox Service', price: 'QAR 950', availability: 'Today', categoryId: 'diagnostics', garageId: 'vendor_qauto_vw', duration: '120 min', warranty: 'Genuine VAG parts', priceValue: 950, rating: 4.6, distanceKm: 7.4 },
  { id: 'oil', title: 'Oil and filter change', price: 'QAR 120', availability: 'Today', categoryId: 'repair', garageId: 'garage_011', duration: '45 min', warranty: '7 days', priceValue: 120, rating: 4.9, distanceKm: 2.4 },
  { id: 'brakes', title: 'Brake pad inspection', price: 'QAR 80', availability: 'Today', categoryId: 'inspection', garageId: 'garage_002', duration: '30 min', warranty: 'Inspection report', priceValue: 80, rating: 4.8, distanceKm: 3.1 },
  { id: 'ac', title: 'AC cooling check', price: 'QAR 150', availability: 'Tomorrow', categoryId: 'diagnostics', garageId: 'garage_011', duration: '60 min', warranty: '14 days', priceValue: 150, rating: 4.9, distanceKm: 2.4 },
  { id: 'battery', title: 'Battery replacement', price: 'QAR 220', availability: 'Today', categoryId: 'battery', garageId: 'garage_006', duration: '35 min', warranty: '6 months', priceValue: 220, rating: 4.6, distanceKm: 5.6 },
];

export const offers: Offer[] = [
  {
    id: 'offer_ac',
    title: '30% off first AC service',
    description: 'Includes cooling test, gas level check, and cabin filter inspection.',
    serviceId: 'ac',
    garageId: 'garage_011',
    discount: '30% off',
    validUntil: 'This week',
  },
  {
    id: 'offer_oil',
    title: 'Free 12-point check with oil change',
    description: 'Book oil and filter service and get a basic safety inspection included.',
    serviceId: 'oil',
    garageId: 'garage_002',
    discount: 'Free check',
    validUntil: '3 days left',
  },
  {
    id: 'offer_battery',
    title: 'Battery install bundle',
    description: 'Battery replacement with installation and alternator test.',
    serviceId: 'battery',
    garageId: 'garage_006',
    discount: 'QAR 40 off',
    validUntil: 'Today',
  },
];

export const cars: CarProfile[] = [
  {
    id: 'car_001',
    name: '2023 Nissan Patrol',
    vin: 'JN1TANY62U0123456',
    plate: 'QAR 1234',
    year: '2023',
    color: 'Pearl White',
    fuelType: 'Petrol V8',
    transmission: 'Automatic',
    insurance: 'Exp. Dec 2026',
    mileage: '42,800 km',
    lastService: 'Mar 15, 2026',
    nextService: 'Oil service in 12 days',
    health: 86,
    serviceHistory: [
      { label: 'Oil & filter change', km: '42,000 km', date: 'Mar 15' },
      { label: 'Brake inspection', km: '38,500 km', date: 'Jan 22' },
      { label: 'AC cooling service', km: '35,000 km', date: 'Oct 10' },
    ],
  },
  {
    id: 'car_002',
    name: '2021 BMW X5',
    vin: 'WBAJU61090B123456',
    plate: 'BMW 4521',
    year: '2021',
    color: 'Carbon Black',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    insurance: 'Exp. Aug 2026',
    mileage: '61,200 km',
    lastService: 'Feb 8, 2026',
    nextService: 'Brake check recommended',
    health: 74,
    serviceHistory: [
      { label: 'Full diagnostics', km: '60,000 km', date: 'Feb 8' },
      { label: 'Tyre rotation', km: '55,000 km', date: 'Nov 3' },
      { label: 'Oil & filter change', km: '50,000 km', date: 'Jul 19' },
    ],
  },
];

export const bookings: Booking[] = [
  {
    id: 'booking_001',
    garage: 'QSpeedy Auto Garage',
    service: 'Oil and filter change',
    vehicle: '2023 Nissan Patrol',
    date: 'Today, 4:30 PM',
    status: 'Confirmed',
  },
  {
    id: 'booking_002',
    garage: 'CrooZr Auto Center',
    service: 'AC cooling check',
    vehicle: '2021 BMW X5',
    date: 'Tomorrow, 10:00 AM',
    status: 'Pending',
  },
  {
    id: 'booking_003',
    garage: 'QSpeedy Auto Garage',
    service: 'Oil and filter change',
    vehicle: '2022 Hyundai Tucson',
    vehiclePlate: 'HYN 6621',
    date: 'Jun 1, 3:00 PM',
    timeSlot: '3:00 PM',
    status: 'Completed',
    vendorBookingId: 'vb_006',
    totalAmount: 221.5,
    paymentMethod: 'Card',
  },
];

export function findGarage(id: string) {
  return garages.find((garage) => garage.id === id) ?? garages[0];
}

export function findCategory(id: string) {
  return serviceCategories.find((category) => category.id === id) ?? serviceCategories[0];
}

export function findJob(id: string) {
  return popularJobs.find((job) => job.id === id) ?? popularJobs[0];
}

export function findOffer(id: string) {
  return offers.find((offer) => offer.id === id) ?? offers[0];
}

export function findCar(id: string) {
  return cars.find((car) => car.id === id) ?? cars[0];
}

export function findBooking(id: string) {
  return bookings.find((booking) => booking.id === id) ?? bookings[0];
}
