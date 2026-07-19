import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyBookingStatusChange } from '@/lib/notifications';
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
  vendorServices as seedVendorServices,
  counterOffers as seedCounterOffers,
  type VendorBooking,
  type VendorBookingStatus,
  type VendorProfile,
  type VendorStaff,
  type VendorInventoryItem,
  type VendorCustomer,
  type VendorInvoice,
  type VendorInvoiceLineItem,
  type VendorPromotion,
  type VendorService,
  type CounterOffer,
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
  mergeFirestoreBookings: (firestoreBookings: Booking[]) => void;
  mergeVendorFirestoreBookings: (bookings: VendorBooking[]) => void;
  // ── Vendor ────────────────────────────────────────────────────────────────
  vendorBookings: VendorBooking[];
  vendorProfile: VendorProfile;
  vendorStaff: VendorStaff[];
  vendorInventory: VendorInventoryItem[];
  vendorCustomers: VendorCustomer[];
  vendorInvoices: VendorInvoice[];
  vendorPromotions: VendorPromotion[];
  vendorServices: VendorService[];
  counterOffers: CounterOffer[];
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
  updateVendorInvoice: (invoiceId: string, patch: Partial<Pick<VendorInvoice, 'lineItems' | 'discount' | 'discountType' | 'notes' | 'status'>>) => VendorInvoice;
  addInvoiceLineItem: (invoiceId: string, item: Omit<VendorInvoiceLineItem, 'id' | 'total'>) => void;
  removeInvoiceLineItem: (invoiceId: string, lineItemId: string) => void;
  updateInvoiceLineItem: (invoiceId: string, lineItemId: string, patch: Partial<Pick<VendorInvoiceLineItem, 'description' | 'quantity' | 'unitPrice' | 'type'>>) => void;
  addVendorService: (service: Omit<VendorService, 'id'>) => VendorService;
  updateVendorService: (id: string, patch: Partial<Omit<VendorService, 'id'>>) => void;
  toggleVendorService: (id: string) => void;
  submitCounterOffer: (invoiceId: string, bookingId: string, customerName: string, proposedTotal: number, message: string) => CounterOffer;
  resolveCounterOffer: (offerId: string, accept: boolean) => void;
  addVendorPromotion: (promotion?: Partial<VendorPromotion>) => VendorPromotion;
  toggleVendorPromotion: (id: string) => void;
  archiveVendorPromotion: (id: string) => void;
};

export const useQarWheelsStore = create<QarWheelsState>()(
  persist(
    (set, get) => ({
      favoriteGarageIds: [],
      quoteRequests: [],
      bookings: [],
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
      mergeFirestoreBookings: (firestoreBookings) =>
        set((state) => {
          // Keep only locally-created bookings (booking_* prefix) not yet in Firestore
          const fsIds = new Set(firestoreBookings.map((b) => b.id));
          const pendingLocal = state.bookings.filter(
            (b) => b.id.startsWith('booking_') && !fsIds.has(b.id),
          );
          return { bookings: [...firestoreBookings, ...pendingLocal] };
        }),
      mergeVendorFirestoreBookings: (incoming) =>
        set((state) => {
          const inIds = new Set(incoming.map((b) => b.id));
          const seedOnly = state.vendorBookings.filter((b) => !inIds.has(b.id) && b.id.startsWith('vb_'));
          return { vendorBookings: [...incoming, ...seedOnly] };
        }),
      // ── Vendor ────────────────────────────────────────────────────────────────
      vendorBookings: seedVendorBookings,
      vendorProfile: seedVendorProfile,
      vendorStaff: seedVendorStaff,
      vendorInventory: seedVendorInventory,
      vendorCustomers: seedVendorCustomers,
      vendorInvoices: seedVendorInvoices,
      vendorServices: seedVendorServices,
      counterOffers: seedCounterOffers,
      vendorPromotions: seedVendorPromotions,
      updateVendorBookingStatus: (id, status) => {
        if (status === 'Completed') {
          const state = get();
          const existing = state.vendorInvoices.find((inv) => inv.bookingId === id);
          if (!existing) {
            try { get().createVendorInvoice(id); } catch { /* booking may be seed-only */ }
          }
        }
        const booking = get().vendorBookings.find((b) => b.id === id);
        void notifyBookingStatusChange(status, booking?.customerName);
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
          discountType: 'fixed',
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
      updateVendorInvoice: (invoiceId, patch) => {
        let updated!: VendorInvoice;
        set((state) => ({
          vendorInvoices: state.vendorInvoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const lineItems = patch.lineItems ?? inv.lineItems;
            const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
            const tax = Number((subtotal * 0.05).toFixed(2));
            const discountType = patch.discountType ?? inv.discountType;
            const discountRaw = patch.discount ?? inv.discount;
            const discountAmt = discountType === 'percent'
              ? Number(((subtotal * discountRaw) / 100).toFixed(2))
              : Number(discountRaw.toFixed(2));
            const total = Number((subtotal + tax - discountAmt).toFixed(2));
            updated = { ...inv, ...patch, lineItems, subtotal, tax, discount: discountRaw, discountType, total };
            return updated;
          }),
        }));
        return updated;
      },
      addInvoiceLineItem: (invoiceId, item) => {
        set((state) => ({
          vendorInvoices: state.vendorInvoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const newItem: VendorInvoiceLineItem = {
              ...item,
              id: `li_${Date.now()}`,
              total: Number((item.quantity * item.unitPrice).toFixed(2)),
            };
            const lineItems = [...inv.lineItems, newItem];
            const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
            const tax = Number((subtotal * 0.05).toFixed(2));
            const discountAmt = inv.discountType === 'percent'
              ? Number(((subtotal * inv.discount) / 100).toFixed(2))
              : inv.discount;
            return { ...inv, lineItems, subtotal, tax, total: Number((subtotal + tax - discountAmt).toFixed(2)) };
          }),
        }));
      },
      removeInvoiceLineItem: (invoiceId, lineItemId) => {
        set((state) => ({
          vendorInvoices: state.vendorInvoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const lineItems = inv.lineItems.filter((li) => li.id !== lineItemId);
            const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
            const tax = Number((subtotal * 0.05).toFixed(2));
            const discountAmt = inv.discountType === 'percent'
              ? Number(((subtotal * inv.discount) / 100).toFixed(2))
              : inv.discount;
            return { ...inv, lineItems, subtotal, tax, total: Number((subtotal + tax - discountAmt).toFixed(2)) };
          }),
        }));
      },
      updateInvoiceLineItem: (invoiceId, lineItemId, patch) => {
        set((state) => ({
          vendorInvoices: state.vendorInvoices.map((inv) => {
            if (inv.id !== invoiceId) return inv;
            const lineItems = inv.lineItems.map((li) => {
              if (li.id !== lineItemId) return li;
              const qty = patch.quantity ?? li.quantity;
              const price = patch.unitPrice ?? li.unitPrice;
              return { ...li, ...patch, total: Number((qty * price).toFixed(2)) };
            });
            const subtotal = Number(lineItems.reduce((s, li) => s + li.total, 0).toFixed(2));
            const tax = Number((subtotal * 0.05).toFixed(2));
            const discountAmt = inv.discountType === 'percent'
              ? Number(((subtotal * inv.discount) / 100).toFixed(2))
              : inv.discount;
            return { ...inv, lineItems, subtotal, tax, total: Number((subtotal + tax - discountAmt).toFixed(2)) };
          }),
        }));
      },
      addVendorService: (serviceData) => {
        const service: VendorService = { ...serviceData, id: `svc_${Date.now()}` };
        set((state) => ({ vendorServices: [...state.vendorServices, service] }));
        return service;
      },
      updateVendorService: (id, patch) =>
        set((state) => ({
          vendorServices: state.vendorServices.map((s) => s.id === id ? { ...s, ...patch } : s),
        })),
      toggleVendorService: (id) =>
        set((state) => ({
          vendorServices: state.vendorServices.map((s) => s.id === id ? { ...s, active: !s.active } : s),
        })),
      submitCounterOffer: (invoiceId, bookingId, customerName, proposedTotal, message) => {
        const offer: CounterOffer = {
          id: `offer_${Date.now()}`,
          invoiceId,
          bookingId,
          customerName,
          proposedTotal,
          message,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          counterOffers: [offer, ...state.counterOffers],
          vendorInvoices: state.vendorInvoices.map((inv) =>
            inv.id === invoiceId ? { ...inv, counterOfferId: offer.id } : inv,
          ),
        }));
        return offer;
      },
      resolveCounterOffer: (offerId, accept) => {
        set((state) => {
          const offer = state.counterOffers.find((o) => o.id === offerId);
          if (!offer) return state;
          const updatedOffers = state.counterOffers.map((o) =>
            o.id === offerId ? { ...o, status: accept ? 'Accepted' as const : 'Declined' as const } : o,
          );
          let updatedInvoices = state.vendorInvoices;
          if (accept) {
            updatedInvoices = state.vendorInvoices.map((inv) => {
              if (inv.id !== offer.invoiceId) return inv;
              const discountAmt = Number((inv.subtotal + inv.tax - offer.proposedTotal).toFixed(2));
              return {
                ...inv,
                discount: Math.max(0, discountAmt),
                discountType: 'fixed' as const,
                total: offer.proposedTotal,
                counterOfferId: undefined,
              };
            });
          }
          return { counterOffers: updatedOffers, vendorInvoices: updatedInvoices };
        });
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
    }),
    {
      name: 'qarwheels-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Sanitize any Firestore Timestamp objects that may have been persisted
        const tsToStr = (v: unknown): string => {
          if (!v) return '';
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && v !== null) {
            const t = v as Record<string, unknown>;
            if (typeof t.toDate === 'function') return (t.toDate as () => Date)().toISOString();
            if (typeof t.seconds === 'number') return new Date(t.seconds * 1000).toISOString();
          }
          return String(v);
        };
        state.bookings = state.bookings.map((b) => ({
          ...b,
          date: typeof b.date === 'string' ? b.date : tsToStr(b.date as unknown),
          bookingDate: b.bookingDate ? (typeof b.bookingDate === 'string' ? b.bookingDate : tsToStr(b.bookingDate as unknown)) : b.bookingDate,
        }));
      },
      // Only persist user preferences and user-created data; skip seed defaults
      // so that app updates can refresh seed data without a full reset
      partialize: (state) => ({
        favoriteGarageIds: state.favoriteGarageIds,
        quoteRequests: state.quoteRequests,
        bookings: state.bookings,
        notifications: state.notifications,
        language: state.language,
        themeMode: state.themeMode,
        vendorAuthenticated: state.vendorAuthenticated,
        vendorBookings: state.vendorBookings,
        vendorProfile: state.vendorProfile,
        vendorStaff: state.vendorStaff,
        vendorInventory: state.vendorInventory,
        vendorCustomers: state.vendorCustomers,
        vendorInvoices: state.vendorInvoices,
        vendorPromotions: state.vendorPromotions,
        vendorServices: state.vendorServices,
        counterOffers: state.counterOffers,
      }),
    },
  ),
);

export function useQarColors(): QarColors {
  const themeMode = useQarWheelsStore((s) => s.themeMode);
  return getQarColors(themeMode);
}
