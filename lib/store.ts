import { create } from 'zustand';
import { bookings as seedBookings, type Booking } from '@/lib/marketplace';
import { getQarColors, type QarColors, type QarThemeMode } from '@/lib/theme';
import {
  vendorBookings as seedVendorBookings,
  vendorProfile as seedVendorProfile,
  vendorStaff as seedVendorStaff,
  vendorInventory as seedVendorInventory,
  vendorCustomers as seedVendorCustomers,
  vendorInvoices as seedVendorInvoices,
  vendorPromotions as seedVendorPromotions,
  type VendorBooking,
  type VendorBookingStatus,
  type VendorProfile,
  type VendorStaff,
  type VendorInventoryItem,
  type VendorCustomer,
  type VendorInvoice,
  type VendorInvoiceLineItem,
  type VendorPromotion,
} from '@/lib/vendor-data';

type BookingCreateInput = Omit<Booking, 'id' | 'status' | 'vendorBookingId'> & {
  status?: Booking['status'];
  customerName?: string;
  customerPhone?: string;
  serviceCategory?: string;
};

export type QuoteRequest = {
  id: string;
  issue: string;
  vehicle: string;
  status: 'Draft' | 'Sent' | 'Quoted';
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

type QarWheelsState = {
  // ── Customer ──────────────────────────────────────────────────────────────
  favoriteGarageIds: string[];
  quoteRequests: QuoteRequest[];
  bookings: Booking[];
  notifications: NotificationItem[];
  language: 'en' | 'ar';
  themeMode: QarThemeMode;
  vendorAuthenticated: boolean;
  toggleFavoriteGarage: (garageId: string) => boolean;
  createQuoteRequest: (input: Pick<QuoteRequest, 'issue' | 'vehicle'>) => QuoteRequest;
  createBooking: (input: BookingCreateInput) => Booking;
  cancelBooking: (id: string) => void;
  rescheduleBooking: (id: string, input: { date: string; bookingDate?: string; timeSlot?: string }) => void;
  markNotificationsRead: () => void;
  setLanguage: (language: 'en' | 'ar') => void;
  setThemeMode: (mode: QarThemeMode) => void;
  toggleThemeMode: () => void;
  setVendorAuthenticated: (authenticated: boolean) => void;
  // ── Vendor ────────────────────────────────────────────────────────────────
  vendorBookings: VendorBooking[];
  vendorProfile: VendorProfile;
  vendorStaff: VendorStaff[];
  vendorInventory: VendorInventoryItem[];
  vendorCustomers: VendorCustomer[];
  vendorInvoices: VendorInvoice[];
  vendorPromotions: VendorPromotion[];
  updateVendorBookingStatus: (id: string, status: VendorBookingStatus) => void;
  assignVendorBookingStaff: (bookingId: string, staffId: string, staffName: string) => void;
  addVendorStaff: (staff: Omit<VendorStaff, 'id'>) => VendorStaff;
  addVendorInventoryItem: (item: Omit<VendorInventoryItem, 'id' | 'lastRestocked'> & { lastRestocked?: string }) => VendorInventoryItem;
  updateVendorInventoryQty: (itemId: string, delta: number) => void;
  updateVendorProfile: (patch: Partial<VendorProfile>) => void;
  submitVendorKyc: (input: Partial<VendorProfile['kyc']>) => void;
  toggleVendorVacationMode: () => void;
  updateVendorCustomerNotes: (customerId: string, notes: string) => void;
  createVendorInvoice: (bookingId: string) => VendorInvoice;
  addVendorPromotion: (promotion?: Partial<VendorPromotion>) => VendorPromotion;
  toggleVendorPromotion: (id: string) => void;
  archiveVendorPromotion: (id: string) => void;
};

export const useQarWheelsStore = create<QarWheelsState>((set, get) => ({
  favoriteGarageIds: [],
  quoteRequests: [],
  bookings: seedBookings,
  notifications: [
    {
      id: 'notif_booking',
      title: 'Booking confirmed',
      body: 'QSpeedy Auto Garage confirmed today at 4:30 PM.',
      read: false,
    },
    {
      id: 'notif_maintenance',
      title: 'Maintenance reminder',
      body: 'Your Nissan Patrol oil service is due soon.',
      read: false,
    },
    {
      id: 'notif_quote',
      title: 'Quote received',
      body: 'CrooZr Auto Center responded to your AC check request.',
      read: true,
    },
  ],
  language: 'en',
  themeMode: 'dark',
  vendorAuthenticated: false,
  toggleFavoriteGarage: (garageId) => {
    const isFavorite = get().favoriteGarageIds.includes(garageId);
    set((state) => ({
      favoriteGarageIds: isFavorite
        ? state.favoriteGarageIds.filter((id) => id !== garageId)
        : [...state.favoriteGarageIds, garageId],
    }));
    return !isFavorite;
  },
  createQuoteRequest: (input) => {
    const request: QuoteRequest = {
      id: `quote_${Date.now()}`,
      issue: input.issue,
      vehicle: input.vehicle,
      status: 'Sent',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      quoteRequests: [request, ...state.quoteRequests],
      notifications: [
        {
          id: `notif_${request.id}`,
          title: 'Quote request sent',
          body: 'Approved garages can now respond with price and availability.',
          read: false,
        },
        ...state.notifications,
      ],
    }));
    return request;
  },
  createBooking: (input) => {
    const createdAt = new Date().toISOString();
    const bookingId = `booking_${Date.now()}`;
    const vendorBookingId = `vb_user_${Date.now()}`;
    const booking: Booking = {
      ...input,
      id: bookingId,
      vendorBookingId,
      status: input.status ?? 'Pending',
    };
    const vendorBooking: VendorBooking = {
      id: vendorBookingId,
      customerName: input.customerName ?? 'QarWheels Customer',
      customerPhone: input.customerPhone ?? '+974 pending',
      vehicle: input.vehicle,
      vehiclePlate: input.vehiclePlate ?? 'Plate pending',
      service: input.service,
      serviceCategory: input.serviceCategory ?? 'repair',
      date: input.bookingDate
        ? new Date(input.bookingDate).toLocaleDateString('en-QA', { month: 'short', day: 'numeric' })
        : input.date.split(',')[0] || 'Pending',
      timeSlot: input.timeSlot ?? input.date.split(',')[1]?.trim() ?? 'Pending',
      status: input.status ?? 'Pending',
      notes: input.notes,
      pickupEnabled: input.pickupEnabled,
      dropoffEnabled: input.dropoffEnabled,
      address: input.address,
      paymentMethod: input.paymentMethod,
      addOns: input.addOns,
      totalAmount: input.totalAmount ?? 0,
      chatId: `chat_${vendorBookingId}`,
      createdAt,
    };
    set((state) => ({
      bookings: [booking, ...state.bookings],
      vendorBookings: [vendorBooking, ...state.vendorBookings],
      notifications: [
        {
          id: `notif_${booking.id}`,
          title: 'Booking request created',
          body: `${booking.garage} received your ${booking.service} request.`,
          read: false,
        },
        ...state.notifications,
      ],
    }));
    return booking;
  },
  cancelBooking: (id) =>
    set((state) => {
      const booking = state.bookings.find((item) => item.id === id);
      const vendorBookingId = booking?.vendorBookingId;
      return {
        bookings: state.bookings.map((item) =>
          item.id === id ? { ...item, status: 'Cancelled' } : item,
        ),
        vendorBookings: state.vendorBookings.map((item) =>
          item.id === vendorBookingId ? { ...item, status: 'Cancelled' } : item,
        ),
        notifications: [
          {
            id: `notif_cancel_${id}_${Date.now()}`,
            title: 'Booking cancelled',
            body: booking ? `${booking.service} at ${booking.garage} has been cancelled.` : 'Your booking has been cancelled.',
            read: false,
          },
          ...state.notifications,
        ],
      };
    }),
  rescheduleBooking: (id, input) =>
    set((state) => {
      const booking = state.bookings.find((item) => item.id === id);
      const vendorBookingId = booking?.vendorBookingId;
      const dateLabel = input.date.split(',')[0] || input.date;
      const timeLabel = input.timeSlot ?? input.date.split(',')[1]?.trim() ?? 'Pending';
      return {
        bookings: state.bookings.map((item) =>
          item.id === id
            ? {
                ...item,
                date: input.date,
                bookingDate: input.bookingDate ?? item.bookingDate,
                timeSlot: input.timeSlot ?? item.timeSlot,
                status: item.status === 'Cancelled' || item.status === 'Completed' ? item.status : 'Pending',
                rescheduledAt: new Date().toISOString(),
              }
            : item,
        ),
        vendorBookings: state.vendorBookings.map((item) =>
          item.id === vendorBookingId
            ? {
                ...item,
                date: dateLabel,
                timeSlot: timeLabel,
                status: item.status === 'Cancelled' || item.status === 'Completed' ? item.status : 'Pending',
              }
            : item,
        ),
        notifications: [
          {
            id: `notif_reschedule_${id}_${Date.now()}`,
            title: 'Reschedule requested',
            body: booking ? `${booking.service} moved to ${input.date}.` : `Booking moved to ${input.date}.`,
            read: false,
          },
          ...state.notifications,
        ],
      };
    }),
  markNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    }));
  },
  setLanguage: (language) => set({ language }),
  setThemeMode: (themeMode) => set({ themeMode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' })),
  setVendorAuthenticated: (vendorAuthenticated) => set({ vendorAuthenticated }),
  // ── Vendor ────────────────────────────────────────────────────────────────
  vendorBookings: seedVendorBookings,
  vendorProfile: seedVendorProfile,
  vendorStaff: seedVendorStaff,
  vendorInventory: seedVendorInventory,
  vendorCustomers: seedVendorCustomers,
  vendorInvoices: seedVendorInvoices,
  vendorPromotions: seedVendorPromotions,
  updateVendorBookingStatus: (id, status) => {
    if (status === 'Completed') {
      // Auto-generate invoice if one doesn't exist yet
      const state = get();
      const existing = state.vendorInvoices.find((inv) => inv.bookingId === id);
      if (!existing) {
        try { get().createVendorInvoice(id); } catch { /* booking may be seed-only */ }
      }
    }
    set((state) => ({
      vendorBookings: state.vendorBookings.map((b) =>
        b.id === id ? { ...b, status } : b,
      ),
      bookings: state.bookings.map((b) =>
        b.vendorBookingId === id ? { ...b, status } : b,
      ),
      notifications: [
        {
          id: `notif_status_${id}_${Date.now()}`,
          title: 'Booking status updated',
          body: `Your booking is now ${status}.`,
          read: false,
        },
        ...state.notifications,
      ],
    }));
  },
  assignVendorBookingStaff: (bookingId, staffId, staffName) =>
    set((state) => ({
      vendorBookings: state.vendorBookings.map((b) =>
        b.id === bookingId ? { ...b, staffId, staffName } : b,
      ),
    })),
  addVendorStaff: (staffData) => {
    const staff: VendorStaff = { ...staffData, id: `staff_${Date.now()}` };
    set((state) => ({ vendorStaff: [...state.vendorStaff, staff] }));
    return staff;
  },
  addVendorInventoryItem: (itemData) => {
    const item: VendorInventoryItem = {
      ...itemData,
      id: `inv_item_${Date.now()}`,
      lastRestocked: itemData.lastRestocked ?? new Date().toLocaleDateString('en-QA', { month: 'short', day: 'numeric' }),
    };
    set((state) => ({ vendorInventory: [item, ...state.vendorInventory] }));
    return item;
  },
  updateVendorInventoryQty: (itemId, delta) =>
    set((state) => ({
      vendorInventory: state.vendorInventory.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
      ),
    })),
  updateVendorProfile: (patch) =>
    set((state) => ({ vendorProfile: { ...state.vendorProfile, ...patch } })),
  submitVendorKyc: (input) =>
    set((state) => ({
      vendorProfile: {
        ...state.vendorProfile,
        verified: false,
        kyc: {
          ...state.vendorProfile.kyc,
          ...input,
          status: 'Pending',
        },
      },
    })),
  toggleVendorVacationMode: () =>
    set((state) => ({
      vendorProfile: { ...state.vendorProfile, vacationMode: !state.vendorProfile.vacationMode },
    })),
  updateVendorCustomerNotes: (customerId, notes) =>
    set((state) => ({
      vendorCustomers: state.vendorCustomers.map((c) =>
        c.id === customerId ? { ...c, notes } : c,
      ),
    })),
  createVendorInvoice: (bookingId) => {
    const state = get();
    const existing = state.vendorInvoices.find((invoice) => invoice.bookingId === bookingId);
    if (existing) return existing;

    const booking = state.vendorBookings.find((item) => item.id === bookingId);
    if (!booking) throw new Error('Booking not found.');

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(issueDate.getDate() + 7);
    const subtotal = booking.totalAmount;
    const tax = Number((subtotal * 0.05).toFixed(2));
    const lineItems: VendorInvoiceLineItem[] = [
      {
        id: `li_${Date.now()}`,
        description: booking.service,
        type: 'service',
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
      },
    ];
    const invoice: VendorInvoice = {
      id: `inv_${Date.now()}`,
      bookingId,
      customerName: booking.customerName,
      vehicle: booking.vehicle,
      issueDate: issueDate.toLocaleDateString('en-QA', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate: dueDate.toLocaleDateString('en-QA', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Draft',
      lineItems,
      subtotal,
      tax,
      discount: 0,
      total: Number((subtotal + tax).toFixed(2)),
    };
    set((current) => ({
      vendorInvoices: [invoice, ...current.vendorInvoices],
      vendorBookings: current.vendorBookings.map((item) =>
        item.id === bookingId ? { ...item, invoiceId: invoice.id } : item,
      ),
    }));
    return invoice;
  },
  addVendorPromotion: (promotionData = {}) => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    const promotion: VendorPromotion = {
      id: `promo_${Date.now()}`,
      title: promotionData.title ?? 'New seasonal offer',
      description: promotionData.description ?? 'A limited-time offer created from the vendor app.',
      discount: promotionData.discount ?? '10% off',
      discountType: promotionData.discountType ?? 'percent',
      discountValue: promotionData.discountValue ?? 10,
      serviceCategory: promotionData.serviceCategory ?? 'repair',
      validFrom: promotionData.validFrom ?? now.toLocaleDateString('en-QA', { month: 'short', day: 'numeric' }),
      validUntil: promotionData.validUntil ?? end.toLocaleDateString('en-QA', { month: 'short', day: 'numeric' }),
      active: promotionData.active ?? true,
      usageCount: promotionData.usageCount ?? 0,
      usageLimit: promotionData.usageLimit ?? 50,
    };
    set((state) => ({ vendorPromotions: [promotion, ...state.vendorPromotions] }));
    return promotion;
  },
  toggleVendorPromotion: (id) =>
    set((state) => ({
      vendorPromotions: state.vendorPromotions.map((promotion) =>
        promotion.id === id ? { ...promotion, active: !promotion.active } : promotion,
      ),
    })),
  archiveVendorPromotion: (id) =>
    set((state) => ({
      vendorPromotions: state.vendorPromotions.filter((promotion) => promotion.id !== id),
    })),
}));

export function useQarColors(): QarColors {
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  return getQarColors(themeMode);
}
