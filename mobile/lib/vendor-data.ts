import {
  STATUS_FLOW,
  getBookingStatusLabel,
  type BookingWorkflowStatus,
} from '@/lib/booking-workflow';

export type VendorBookingStatus = BookingWorkflowStatus;

export function bookingAmountLabel(amount: number): string {
  return Number.isFinite(amount) && amount > 0 ? `QAR ${amount}` : 'Quote pending';
}

export type VendorBooking = {
  id: string;
  branchId?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  vehicle: string;
  vehiclePlate: string;
  service: string;
  serviceCategory: string;
  date: string;
  bookingDate?: string;
  timeSlot: string;
  status: VendorBookingStatus;
  notes?: string;
  pickupEnabled?: boolean;
  dropoffEnabled?: boolean;
  address?: string;
  paymentMethod?: string;
  addOns?: string[];
  staffId?: string;
  staffName?: string;
  totalAmount: number;
  requiresQuote?: boolean;
  acceptedQuoteAmountMinorUnits?: number;
  invoiceId?: string;
  chatId: string;
  createdAt: string;
};

export type VendorStaff = {
  id: string;
  name: string;
  role: string;
  phone: string;
  specialty: string;
  assignedBookings: number;
  available: boolean;
  rating: number;
  joinedDate: string;
  avatarInitials: string;
  color: string;
};

export type VendorInventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
};

export type VendorInvoice = {
  id: string;
  bookingId: string;
  customerName: string;
  vehicle: string;
  issueDate: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  lineItems: VendorInvoiceLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'fixed' | 'percent';
  total: number;
  notes?: string;
  counterOfferId?: string;
};

export type CounterOffer = {
  id: string;
  invoiceId: string;
  bookingId: string;
  customerName: string;
  proposedTotal: number;
  message: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
};

export type VendorService = {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number; // minutes
  description: string;
  active: boolean;
};

export type VendorInvoiceLineItem = {
  id: string;
  description: string;
  type: 'service' | 'part' | 'labour';
  quantity: number;
  unitPrice: number;
  total: number;
};

export type VendorPromotion = {
  id: string;
  title: string;
  description: string;
  discount: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  serviceCategory: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
  usageCount: number;
  usageLimit: number;
};

export type VendorReview = {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  service: string;
  comment: string;
  reply?: string;
  bookingId: string;
};

export type VendorPayout = {
  id: string;
  period: string;
  grossRevenue: number;
  platformFee: number;
  netPayout: number;
  status: 'Pending' | 'Processing' | 'Paid';
  requestedAt?: string;
  paidAt?: string;
  transactions: VendorTransaction[];
};

export type VendorTransaction = {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  amount: number;
  commission: number;
  net: number;
  date: string;
};

export type VendorAnalyticsDay = {
  day: string;
  revenue: number;
  bookings: number;
};

export type VendorAnalytics = {
  period: 'week' | 'month' | 'year';
  totalRevenue: number;
  totalBookings: number;
  avgOrderValue: number;
  completionRate: number;
  repeatRate: number;
  dailyRevenue: VendorAnalyticsDay[];
  topServices: { name: string; count: number; revenue: number }[];
  peakHours: { hour: string; bookings: number }[];
  funnelSteps: { step: string; count: number }[];
};

export type VendorProfile = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  category: string;
  area: string;
  city: string;
  openTime: string;
  closeTime: string;
  workDays: string[];
  slotDurationMin: number;
  maxSlotsPerHour: number;
  vacationMode: boolean;
  notifications: {
    newBooking: boolean;
    bookingReminder: boolean;
    paymentReceived: boolean;
    reviewReceived: boolean;
  };
  kyc: {
    crNumber: string;
    licenseNumber: string;
    bankName: string;
    iban: string;
    status: 'Pending' | 'Verified' | 'Rejected';
  };
  rating: number;
  totalReviews: number;
  verified: boolean;
};

export type VendorCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicles: string[];
  totalBookings: number;
  totalSpend: number;
  lastVisit: string;
  notes: string;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
};

export type VendorChatMessage = {
  id: string;
  bookingId: string;
  sender: 'vendor' | 'customer';
  text: string;
  timestamp: string;
  read: boolean;
};

// ─── Demo Data ────────────────────────────────────────────────────────────────

export const vendorBookings: VendorBooking[] = [
  {
    id: 'vb_001', customerName: 'Ahmed Al-Rashid', customerPhone: '+974 5512 3344',
    vehicle: '2023 Nissan Patrol', vehiclePlate: 'QAR 1234',
    service: 'Oil and filter change', serviceCategory: 'repair',
    date: 'Today', timeSlot: '10:00 AM', status: 'InProgress',
    notes: 'Customer requested synthetic oil', staffId: 'staff_001', staffName: 'Khalid Hassan',
    totalAmount: 145, chatId: 'chat_vb001', createdAt: '2026-06-02T07:30:00Z',
  },
  {
    id: 'vb_002', customerName: 'Sara Mohammed', customerPhone: '+974 5598 7766',
    vehicle: '2021 BMW X5', vehiclePlate: 'BMW 4521',
    service: 'Brake pad inspection', serviceCategory: 'inspection',
    date: 'Today', timeSlot: '11:30 AM', status: 'Confirmed',
    staffId: 'staff_002', staffName: 'Faisal Omar',
    totalAmount: 80, chatId: 'chat_vb002', createdAt: '2026-06-01T18:00:00Z',
  },
  {
    id: 'vb_003', customerName: 'Omar Khalifa', customerPhone: '+974 5533 1122',
    vehicle: '2022 Toyota Land Cruiser', vehiclePlate: 'TLC 0099',
    service: 'AC cooling check', serviceCategory: 'diagnostics',
    date: 'Today', timeSlot: '2:00 PM', status: 'Pending',
    totalAmount: 150, chatId: 'chat_vb003', createdAt: '2026-06-02T09:10:00Z',
  },
  {
    id: 'vb_004', customerName: 'Fatima Al-Dosari', customerPhone: '+974 5577 4455',
    vehicle: '2020 Mercedes GLC', vehiclePlate: 'GLC 3310',
    service: 'Battery replacement', serviceCategory: 'battery',
    date: 'Tomorrow', timeSlot: '9:00 AM', status: 'Confirmed',
    staffId: 'staff_001', staffName: 'Khalid Hassan',
    totalAmount: 220, chatId: 'chat_vb004', createdAt: '2026-06-01T14:00:00Z',
  },
  {
    id: 'vb_005', customerName: 'Yusuf Al-Mansoori', customerPhone: '+974 5544 9988',
    vehicle: '2019 Chevrolet Tahoe', vehiclePlate: 'TAH 8877',
    service: 'Full vehicle diagnostics', serviceCategory: 'diagnostics',
    date: 'Jun 5', timeSlot: '10:30 AM', status: 'Pending',
    totalAmount: 200, chatId: 'chat_vb005', createdAt: '2026-06-02T11:00:00Z',
  },
  {
    id: 'vb_006', customerName: 'Laila Hassan', customerPhone: '+974 5566 3311',
    vehicle: '2022 Hyundai Tucson', vehiclePlate: 'HYN 6621',
    service: 'Oil and filter change', serviceCategory: 'repair',
    date: 'Jun 1', timeSlot: '3:00 PM', status: 'Completed',
    staffId: 'staff_002', staffName: 'Faisal Omar',
    totalAmount: 130, invoiceId: 'inv_001', chatId: 'chat_vb006', createdAt: '2026-05-31T12:00:00Z',
  },
  {
    id: 'vb_007', customerName: 'Mohammed Al-Kuwari', customerPhone: '+974 5522 0011',
    vehicle: '2023 Porsche Cayenne', vehiclePlate: 'POR 5544',
    service: 'Wheel alignment & balancing', serviceCategory: 'repair',
    date: 'May 30', timeSlot: '11:00 AM', status: 'Completed',
    staffId: 'staff_001', staffName: 'Khalid Hassan',
    totalAmount: 180, invoiceId: 'inv_002', chatId: 'chat_vb007', createdAt: '2026-05-28T08:00:00Z',
  },
  {
    id: 'vb_008', customerName: 'Nour Al-Ali', customerPhone: '+974 5511 6677',
    vehicle: '2021 Lexus LX 570', vehiclePlate: 'LEX 2233',
    service: 'Brake fluid replacement', serviceCategory: 'repair',
    date: 'May 28', timeSlot: '4:00 PM', status: 'Cancelled',
    totalAmount: 95, chatId: 'chat_vb008', createdAt: '2026-05-26T16:00:00Z',
  },
];

export const vendorStaff: VendorStaff[] = [
  {
    id: 'staff_001', name: 'Khalid Hassan', role: 'Senior Mechanic', phone: '+974 5500 1122',
    specialty: 'Engine & Transmission', assignedBookings: 3, available: true,
    rating: 4.9, joinedDate: 'Jan 2024', avatarInitials: 'KH', color: '#E31E24',
  },
  {
    id: 'staff_002', name: 'Faisal Omar', role: 'Auto Electrician', phone: '+974 5500 3344',
    specialty: 'Electrical & AC Systems', assignedBookings: 2, available: true,
    rating: 4.7, joinedDate: 'Mar 2024', avatarInitials: 'FO', color: '#3B82F6',
  },
  {
    id: 'staff_003', name: 'Samir Yousef', role: 'Brake & Suspension', phone: '+974 5500 5566',
    specialty: 'Brakes & Tyres', assignedBookings: 0, available: false,
    rating: 4.8, joinedDate: 'Jun 2024', avatarInitials: 'SY', color: '#22C55E',
  },
  {
    id: 'staff_004', name: 'Ali Mansoor', role: 'Apprentice', phone: '+974 5500 7788',
    specialty: 'General Maintenance', assignedBookings: 1, available: true,
    rating: 4.5, joinedDate: 'Feb 2026', avatarInitials: 'AM', color: '#F59E0B',
  },
];

export const vendorInventory: VendorInventoryItem[] = [
  { id: 'inv_item_001', sku: 'OIL-5W30-4L', name: 'Engine Oil 5W-30 (4L)', category: 'Fluids', quantity: 24, minQuantity: 10, unitPrice: 85, unit: 'bottle', supplier: 'Castrol Qatar', lastRestocked: 'Jun 1' },
  { id: 'inv_item_002', sku: 'FILT-OIL-NP', name: 'Oil Filter — Nissan Patrol', category: 'Filters', quantity: 8, minQuantity: 5, unitPrice: 35, unit: 'piece', supplier: 'Nissan Parts', lastRestocked: 'May 28' },
  { id: 'inv_item_003', sku: 'PAD-BRAKE-FR', name: 'Front Brake Pads (set)', category: 'Brakes', quantity: 3, minQuantity: 4, unitPrice: 120, unit: 'set', supplier: 'Brembo ME', lastRestocked: 'May 20' },
  { id: 'inv_item_004', sku: 'BAT-70AH-AGM', name: 'Battery 70Ah AGM', category: 'Electrical', quantity: 6, minQuantity: 3, unitPrice: 185, unit: 'piece', supplier: 'Varta Qatar', lastRestocked: 'May 30' },
  { id: 'inv_item_005', sku: 'FILT-AC-CABIN', name: 'Cabin Air Filter (universal)', category: 'Filters', quantity: 14, minQuantity: 6, unitPrice: 28, unit: 'piece', supplier: 'Mann Filter', lastRestocked: 'Jun 1' },
  { id: 'inv_item_006', sku: 'FLUID-BRAKE-DOT4', name: 'Brake Fluid DOT4 (500ml)', category: 'Fluids', quantity: 11, minQuantity: 8, unitPrice: 22, unit: 'bottle', supplier: 'Mobil Qatar', lastRestocked: 'May 25' },
  { id: 'inv_item_007', sku: 'SPARK-PLUG-IRID', name: 'Iridium Spark Plugs (x4)', category: 'Ignition', quantity: 2, minQuantity: 4, unitPrice: 95, unit: 'set', supplier: 'NGK Parts', lastRestocked: 'May 10' },
  { id: 'inv_item_008', sku: 'WIPER-BLADE-24', name: 'Wiper Blade 24 inch', category: 'Accessories', quantity: 18, minQuantity: 5, unitPrice: 18, unit: 'piece', supplier: 'Bosch Qatar', lastRestocked: 'Jun 2' },
];

export const vendorInvoices: VendorInvoice[] = [
  {
    id: 'inv_001', bookingId: 'vb_006', customerName: 'Laila Hassan', vehicle: '2022 Hyundai Tucson',
    issueDate: 'Jun 1, 2026', dueDate: 'Jun 8, 2026', status: 'Paid',
    lineItems: [
      { id: 'li_001', description: 'Oil and filter change', type: 'service', quantity: 1, unitPrice: 80, total: 80 },
      { id: 'li_002', description: 'Engine Oil 5W-30 4L', type: 'part', quantity: 1, unitPrice: 85, total: 85 },
      { id: 'li_003', description: 'Oil Filter', type: 'part', quantity: 1, unitPrice: 35, total: 35 },
      { id: 'li_004', description: 'Labour charge', type: 'labour', quantity: 1, unitPrice: 30, total: 30 },
    ],
    subtotal: 230, tax: 11.5, discount: 20, discountType: 'fixed', total: 221.5,
  },
  {
    id: 'inv_002', bookingId: 'vb_007', customerName: 'Mohammed Al-Kuwari', vehicle: '2023 Porsche Cayenne',
    issueDate: 'May 30, 2026', dueDate: 'Jun 6, 2026', status: 'Paid',
    lineItems: [
      { id: 'li_005', description: 'Wheel alignment', type: 'service', quantity: 1, unitPrice: 120, total: 120 },
      { id: 'li_006', description: 'Wheel balancing (x4)', type: 'service', quantity: 4, unitPrice: 20, total: 80 },
      { id: 'li_007', description: 'Labour charge', type: 'labour', quantity: 1, unitPrice: 40, total: 40 },
    ],
    subtotal: 240, tax: 12, discount: 0, discountType: 'fixed', total: 252,
  },
  {
    id: 'inv_003', bookingId: 'vb_001', customerName: 'Ahmed Al-Rashid', vehicle: '2023 Nissan Patrol',
    issueDate: 'Jun 2, 2026', dueDate: 'Jun 9, 2026', status: 'Draft',
    lineItems: [
      { id: 'li_008', description: 'Oil and filter change', type: 'service', quantity: 1, unitPrice: 80, total: 80 },
      { id: 'li_009', description: 'Synthetic Engine Oil 5W-30 5L', type: 'part', quantity: 1, unitPrice: 110, total: 110 },
      { id: 'li_010', description: 'Oil Filter', type: 'part', quantity: 1, unitPrice: 35, total: 35 },
      { id: 'li_011', description: 'Labour', type: 'labour', quantity: 1, unitPrice: 30, total: 30 },
    ],
    subtotal: 255, tax: 12.75, discount: 0, discountType: 'fixed', total: 267.75,
  },
];

export const vendorServices: VendorService[] = [
  { id: 'svc_001', name: 'Oil & Filter Change', category: 'Maintenance', basePrice: 80, duration: 45, description: 'Drain, replace engine oil and filter. Includes multi-point check.', active: true },
  { id: 'svc_002', name: 'Wheel Alignment', category: 'Tyres', basePrice: 120, duration: 60, description: 'Four-wheel computerised alignment. Includes printout report.', active: true },
  { id: 'svc_003', name: 'Wheel Balancing', category: 'Tyres', basePrice: 20, duration: 20, description: 'Per wheel dynamic balancing.', active: true },
  { id: 'svc_004', name: 'Brake Pad Replacement', category: 'Brakes', basePrice: 180, duration: 90, description: 'Front or rear brake pad set replacement (parts not included).', active: true },
  { id: 'svc_005', name: 'AC System Check', category: 'AC', basePrice: 60, duration: 30, description: 'Cooling test, gas pressure check, cabin filter inspection.', active: true },
  { id: 'svc_006', name: 'AC Gas Recharge', category: 'AC', basePrice: 150, duration: 60, description: 'Full AC refrigerant drain and recharge (R134a).', active: true },
  { id: 'svc_007', name: 'Full Vehicle Diagnostics', category: 'Diagnostics', basePrice: 90, duration: 60, description: 'OBD-II scan + road test + 50-point inspection report.', active: true },
  { id: 'svc_008', name: 'Battery Replacement', category: 'Electrical', basePrice: 40, duration: 30, description: 'Remove and fit new battery (battery sold separately).', active: true },
  { id: 'svc_009', name: 'Tyre Change (x4)', category: 'Tyres', basePrice: 80, duration: 45, description: 'Mount and balance four tyres (tyres sold separately).', active: true },
  { id: 'svc_010', name: 'Labour (per hour)', category: 'Labour', basePrice: 60, duration: 60, description: 'General mechanic labour charge per hour.', active: true },
];

export const counterOffers: CounterOffer[] = [];

export const vendorPromotions: VendorPromotion[] = [
  {
    id: 'promo_001', title: '30% off first AC service', description: 'Includes cooling test, gas level check, and cabin filter inspection.',
    discount: '30% off', discountType: 'percent', discountValue: 30,
    serviceCategory: 'diagnostics', validFrom: 'Jun 1', validUntil: 'Jun 7', active: true, usageCount: 14, usageLimit: 50,
  },
  {
    id: 'promo_002', title: 'Free 12-point check with oil change', description: 'Book oil and filter service and get a basic safety inspection included.',
    discount: 'Free check', discountType: 'fixed', discountValue: 0,
    serviceCategory: 'repair', validFrom: 'Jun 1', validUntil: 'Jun 10', active: true, usageCount: 28, usageLimit: 100,
  },
  {
    id: 'promo_003', title: 'Battery install bundle — QAR 40 off', description: 'Battery replacement with installation and alternator test.',
    discount: 'QAR 40 off', discountType: 'fixed', discountValue: 40,
    serviceCategory: 'battery', validFrom: 'Jun 2', validUntil: 'Jun 2', active: false, usageCount: 7, usageLimit: 20,
  },
];

export const vendorReviews: VendorReview[] = [
  {
    id: 'rev_001', customerName: 'Laila Hassan', rating: 5, date: 'Jun 1, 2026',
    service: 'Oil and filter change', bookingId: 'vb_006',
    comment: 'Excellent service! Khalid was professional and finished within the promised time. Will definitely come back.',
    reply: 'Thank you Laila! We appreciate your kind words. See you next time!',
  },
  {
    id: 'rev_002', customerName: 'Mohammed Al-Kuwari', rating: 5, date: 'May 30, 2026',
    service: 'Wheel alignment & balancing', bookingId: 'vb_007',
    comment: 'Very thorough work. The car drives perfectly now. Staff were friendly and explained everything clearly.',
  },
  {
    id: 'rev_003', customerName: 'Ahmed Al-Rashid', rating: 4, date: 'May 25, 2026',
    service: 'AC cooling check', bookingId: 'vb_009',
    comment: 'Good service overall. Took slightly longer than estimated but the quality was there.',
    reply: 'Thank you Ahmed! We apologize for the delay and appreciate your patience.',
  },
  {
    id: 'rev_004', customerName: 'Sara Mohammed', rating: 5, date: 'May 20, 2026',
    service: 'Full vehicle diagnostics', bookingId: 'vb_010',
    comment: 'Faisal was amazing — identified the electrical issue immediately. Very honest and transparent pricing.',
  },
  {
    id: 'rev_005', customerName: 'Omar Khalifa', rating: 3, date: 'May 15, 2026',
    service: 'Brake pad inspection', bookingId: 'vb_011',
    comment: 'Service was ok but waiting area could be improved. The work itself was done properly.',
  },
];

export const vendorPayouts: VendorPayout[] = [
  {
    id: 'payout_001', period: 'May 2026', grossRevenue: 4280, platformFee: 428, netPayout: 3852,
    status: 'Paid', paidAt: 'Jun 1, 2026',
    transactions: [
      { id: 'txn_001', bookingId: 'vb_007', customerName: 'Mohammed Al-Kuwari', service: 'Wheel alignment', amount: 252, commission: 25.2, net: 226.8, date: 'May 30' },
      { id: 'txn_002', bookingId: 'vb_006', customerName: 'Laila Hassan', service: 'Oil change', amount: 221.5, commission: 22.15, net: 199.35, date: 'Jun 1' },
    ],
  },
  {
    id: 'payout_002', period: 'Jun 1–2, 2026', grossRevenue: 375, platformFee: 37.5, netPayout: 337.5,
    status: 'Pending', requestedAt: 'Jun 2, 2026',
    transactions: [
      { id: 'txn_003', bookingId: 'vb_001', customerName: 'Ahmed Al-Rashid', service: 'Oil change', amount: 145, commission: 14.5, net: 130.5, date: 'Jun 2' },
      { id: 'txn_004', bookingId: 'vb_002', customerName: 'Sara Mohammed', service: 'Brake inspection', amount: 80, commission: 8, net: 72, date: 'Jun 2' },
      { id: 'txn_005', bookingId: 'vb_003', customerName: 'Omar Khalifa', service: 'AC check', amount: 150, commission: 15, net: 135, date: 'Jun 2' },
    ],
  },
];

export const vendorAnalyticsWeek: VendorAnalytics = {
  period: 'week',
  totalRevenue: 1640,
  totalBookings: 11,
  avgOrderValue: 149,
  completionRate: 87.5,
  repeatRate: 42,
  dailyRevenue: [
    { day: 'Mon', revenue: 280, bookings: 2 },
    { day: 'Tue', revenue: 350, bookings: 3 },
    { day: 'Wed', revenue: 190, bookings: 1 },
    { day: 'Thu', revenue: 420, bookings: 3 },
    { day: 'Fri', revenue: 0, bookings: 0 },
    { day: 'Sat', revenue: 260, bookings: 2 },
    { day: 'Sun', revenue: 140, bookings: 1 },
  ],
  topServices: [
    { name: 'Oil & Filter Change', count: 4, revenue: 520 },
    { name: 'AC Cooling Check', count: 3, revenue: 450 },
    { name: 'Battery Replacement', count: 2, revenue: 440 },
    { name: 'Brake Inspection', count: 2, revenue: 160 },
  ],
  peakHours: [
    { hour: '9 AM', bookings: 3 },
    { hour: '10 AM', bookings: 5 },
    { hour: '11 AM', bookings: 4 },
    { hour: '12 PM', bookings: 2 },
    { hour: '2 PM', bookings: 6 },
    { hour: '3 PM', bookings: 4 },
    { hour: '4 PM', bookings: 2 },
  ],
  funnelSteps: [
    { step: 'Views', count: 320 },
    { step: 'Quote Requests', count: 48 },
    { step: 'Bookings', count: 11 },
    { step: 'Completed', count: 9 },
  ],
};

export const vendorAnalyticsMonth: VendorAnalytics = {
  period: 'month',
  totalRevenue: 7280,
  totalBookings: 48,
  avgOrderValue: 152,
  completionRate: 89.6,
  repeatRate: 45,
  dailyRevenue: [
    { day: 'W1', revenue: 1640, bookings: 11 },
    { day: 'W2', revenue: 1920, bookings: 13 },
    { day: 'W3', revenue: 1880, bookings: 12 },
    { day: 'W4', revenue: 1840, bookings: 12 },
  ],
  topServices: [
    { name: 'Oil & Filter Change', count: 18, revenue: 2340 },
    { name: 'AC Cooling Check', count: 12, revenue: 1800 },
    { name: 'Battery Replacement', count: 8, revenue: 1760 },
    { name: 'Brake Inspection', count: 10, revenue: 800 },
  ],
  peakHours: [
    { hour: '9 AM', bookings: 12 },
    { hour: '10 AM', bookings: 20 },
    { hour: '11 AM', bookings: 16 },
    { hour: '12 PM', bookings: 8 },
    { hour: '2 PM', bookings: 24 },
    { hour: '3 PM', bookings: 16 },
    { hour: '4 PM', bookings: 8 },
  ],
  funnelSteps: [
    { step: 'Views', count: 1240 },
    { step: 'Quote Requests', count: 186 },
    { step: 'Bookings', count: 48 },
    { step: 'Completed', count: 43 },
  ],
};

export const vendorAnalyticsYear: VendorAnalytics = {
  period: 'year',
  totalRevenue: 86400,
  totalBookings: 572,
  avgOrderValue: 151,
  completionRate: 91.2,
  repeatRate: 52,
  dailyRevenue: [
    { day: 'Jan', revenue: 6200, bookings: 41 },
    { day: 'Feb', revenue: 5800, bookings: 38 },
    { day: 'Mar', revenue: 7100, bookings: 47 },
    { day: 'Apr', revenue: 7400, bookings: 49 },
    { day: 'May', revenue: 8200, bookings: 54 },
    { day: 'Jun', revenue: 7280, bookings: 48 },
  ],
  topServices: [
    { name: 'Oil & Filter Change', count: 214, revenue: 27820 },
    { name: 'AC Cooling Check', count: 142, revenue: 21300 },
    { name: 'Battery Replacement', count: 96, revenue: 21120 },
    { name: 'Brake Inspection', count: 120, revenue: 9600 },
  ],
  peakHours: [
    { hour: '9 AM', bookings: 142 },
    { hour: '10 AM', bookings: 236 },
    { hour: '11 AM', bookings: 194 },
    { hour: '12 PM', bookings: 98 },
    { hour: '2 PM', bookings: 284 },
    { hour: '3 PM', bookings: 196 },
    { hour: '4 PM', bookings: 96 },
  ],
  funnelSteps: [
    { step: 'Views', count: 14800 },
    { step: 'Quote Requests', count: 2220 },
    { step: 'Bookings', count: 572 },
    { step: 'Completed', count: 521 },
  ],
};

export function getAnalyticsForPeriod(period: 'This Week' | 'This Month' | 'This Year'): VendorAnalytics {
  if (period === 'This Month') return vendorAnalyticsMonth;
  if (period === 'This Year') return vendorAnalyticsYear;
  return vendorAnalyticsWeek;
}

export const vendorProfile: VendorProfile = {
  id: 'vendor_001',
  businessName: 'QSpeedy Auto Garage',
  ownerName: 'Walid Al-Harbi',
  email: 'walid@qspeedyauto.qa',
  phone: '+974 4412 8899',
  category: 'Auto repair shop',
  area: 'Building 170 Street 18',
  city: 'Doha',
  openTime: '08:00',
  closeTime: '20:00',
  workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat', 'Sun'],
  slotDurationMin: 60,
  maxSlotsPerHour: 3,
  vacationMode: false,
  notifications: { newBooking: true, bookingReminder: true, paymentReceived: true, reviewReceived: false },
  kyc: { crNumber: 'CR-2024-QA-18201', licenseNumber: 'MOI-GRG-0047', bankName: 'Qatar National Bank', iban: 'QA57QNBA000000001234567890A', status: 'Verified' },
  rating: 4.9,
  totalReviews: 260,
  verified: true,
};

export const vendorCustomers: VendorCustomer[] = [
  { id: 'cust_001', name: 'Ahmed Al-Rashid', phone: '+974 5512 3344', email: 'ahmed@email.com', vehicles: ['2023 Nissan Patrol'], totalBookings: 5, totalSpend: 680, lastVisit: 'Jun 2', notes: 'Prefers Khalid as mechanic. Uses synthetic oil.', loyaltyTier: 'Gold' },
  { id: 'cust_002', name: 'Sara Mohammed', phone: '+974 5598 7766', email: 'sara@email.com', vehicles: ['2021 BMW X5'], totalBookings: 3, totalSpend: 420, lastVisit: 'Jun 2', notes: '', loyaltyTier: 'Silver' },
  { id: 'cust_003', name: 'Omar Khalifa', phone: '+974 5533 1122', email: 'omar@email.com', vehicles: ['2022 Toyota Land Cruiser'], totalBookings: 2, totalSpend: 290, lastVisit: 'Jun 2', notes: 'Fleet manager — multiple vehicles possible.', loyaltyTier: 'Bronze' },
  { id: 'cust_004', name: 'Mohammed Al-Kuwari', phone: '+974 5522 0011', email: 'mak@email.com', vehicles: ['2023 Porsche Cayenne', '2022 Range Rover Sport'], totalBookings: 8, totalSpend: 1240, lastVisit: 'May 30', notes: 'High-value customer. Very detail-oriented.', loyaltyTier: 'Platinum' },
  { id: 'cust_005', name: 'Laila Hassan', phone: '+974 5566 3311', email: 'laila@email.com', vehicles: ['2022 Hyundai Tucson'], totalBookings: 4, totalSpend: 530, lastVisit: 'Jun 1', notes: '', loyaltyTier: 'Silver' },
];

export const vendorChatMessages: Record<string, VendorChatMessage[]> = {
  chat_vb001: [
    { id: 'm1', bookingId: 'vb_001', sender: 'customer', text: 'Hi, is my car ready yet?', timestamp: '10:15 AM', read: true },
    { id: 'm2', bookingId: 'vb_001', sender: 'vendor', text: 'Hi Ahmed! Still working on it. We started the oil drain 15 min ago. Should be ready by 11 AM.', timestamp: '10:18 AM', read: true },
    { id: 'm3', bookingId: 'vb_001', sender: 'customer', text: 'Perfect, thanks for the update!', timestamp: '10:20 AM', read: true },
    { id: 'm4', bookingId: 'vb_001', sender: 'vendor', text: 'We also noticed your cabin air filter is quite dirty — want us to replace it? QAR 28 extra.', timestamp: '10:35 AM', read: false },
  ],
  chat_vb002: [
    { id: 'm5', bookingId: 'vb_002', sender: 'customer', text: 'Can I arrive 10 minutes early?', timestamp: '9:00 AM', read: true },
    { id: 'm6', bookingId: 'vb_002', sender: 'vendor', text: 'Of course Sara! We\'ll be ready for you.', timestamp: '9:05 AM', read: true },
  ],
  chat_vb003: [
    { id: 'm7', bookingId: 'vb_003', sender: 'customer', text: 'My AC makes a strange noise when it first starts.', timestamp: '8:45 AM', read: true },
    { id: 'm8', bookingId: 'vb_003', sender: 'vendor', text: 'Noted Omar. Could be the compressor clutch. We\'ll do a full check at 2 PM.', timestamp: '9:00 AM', read: true },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function findVendorBooking(id: string): VendorBooking {
  return vendorBookings.find((b) => b.id === id) ?? vendorBookings[0];
}

export function findVendorStaff(id: string): VendorStaff {
  return vendorStaff.find((s) => s.id === id) ?? vendorStaff[0];
}

export function findVendorCustomer(id: string): VendorCustomer {
  return vendorCustomers.find((c) => c.id === id) ?? vendorCustomers[0];
}

export function getBookingsByStatus(status: VendorBookingStatus): VendorBooking[] {
  return vendorBookings.filter((b) => b.status === status);
}

export function getStatusLabel(status: VendorBookingStatus): string {
  return getBookingStatusLabel(status);
}

export function getStatusColor(status: VendorBookingStatus): { bg: string; text: string; dot: string } {
  const map: Record<VendorBookingStatus, { bg: string; text: string; dot: string }> = {
    Pending:         { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B', dot: '#F59E0B' },
    Confirmed:       { bg: 'rgba(34,197,94,0.14)', text: '#22C55E', dot: '#22C55E' },
    VehicleReceived: { bg: 'rgba(59,130,246,0.14)', text: '#3B82F6', dot: '#3B82F6' },
    InProgress:      { bg: 'rgba(227,30,36,0.14)', text: '#E31E24', dot: '#E31E24' },
    ReadyForPickup:  { bg: 'rgba(212,175,55,0.14)', text: '#D4AF37', dot: '#D4AF37' },
    Completed:       { bg: 'rgba(34,197,94,0.14)', text: '#22C55E', dot: '#22C55E' },
    Declined:        { bg: 'rgba(239,68,68,0.14)', text: '#EF4444', dot: '#EF4444' },
    Cancelled:       { bg: 'rgba(239,68,68,0.14)', text: '#EF4444', dot: '#EF4444' },
    NoShow:          { bg: 'rgba(148,163,184,0.16)', text: '#64748B', dot: '#64748B' },
  };
  return map[status];
}

export { STATUS_FLOW };
