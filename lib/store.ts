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

/** Short human-quotable reference for a ledger entry, e.g. "PAY-K3F9QX". */
function makeReference(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

/**
 * Unique id for a locally-created record.
 *
 * `Date.now()` alone is not enough: two records created in the same
 * millisecond — a double tap, or a loop — collide, and React list keys plus
 * every `find(x => x.id === id)` lookup then resolve to the wrong record.
 * A monotonic counter makes collisions impossible within a session.
 */
let idCounter = 0;
function makeId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

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

// ─── Account domain ──────────────────────────────────────────────────────────
// Wallet, ledger, documents and addresses were previously hardcoded strings in
// the UI ("QAR 280.00", two fixed addresses, three invented invoices). They are
// real persisted state now, so a top-up changes the balance, a booking debits
// it, and the ledger explains every movement.

export type SavedAddress = {
  id: string;
  /** User-supplied name: "Home", "Villa 12", "Mum's place". */
  label: string;
  line: string;
  area: string;
  /** Free-text landmark or delivery note for the driver. */
  instructions?: string;
  isDefault: boolean;
  createdAt: string;
};

export type WalletTxnKind = 'topup' | 'payment' | 'refund' | 'reward';

export type WalletTransaction = {
  id: string;
  kind: WalletTxnKind;
  /** Positive credits the wallet, negative debits it. Always QAR. */
  amount: number;
  description: string;
  /** Balance immediately after this entry — makes the ledger auditable. */
  balanceAfter: number;
  createdAt: string;
  bookingId?: string;
  invoiceId?: string;
  method?: string;
  reference: string;
};

export type StoredInvoice = {
  id: string;
  /** Human reference, e.g. INV-2026-0184. */
  number: string;
  bookingId?: string;
  garage: string;
  service: string;
  vehicle?: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Refunded';
  method: string;
  issuedAt: string;
};

export type VaultDocumentKind =
  | 'license'
  | 'id'
  | 'insurance'
  | 'registration'
  | 'invoice'
  | 'other';

export type VaultDocument = {
  id: string;
  kind: VaultDocumentKind;
  title: string;
  /** Local file URI from the picker. */
  uri: string;
  mimeType?: string;
  sizeBytes?: number;
  /** ISO date; surfaced as an expiry warning when near. */
  expiresAt?: string;
  /** Optional link to a vehicle in the garage. */
  vehicleId?: string;
  addedAt: string;
};

type QarWheelState = {
  // ── Customer ──────────────────────────────────────────────────────────────
  favoriteGarageIds: string[];
  quoteRequests: QuoteRequest[];
  bookings: Booking[];
  notifications: NotificationItem[];
  language: 'en' | 'ar';
  themeMode: QarThemeMode;
  /** False until the user has explicitly chosen a theme during onboarding. */
  themeChosen: boolean;
  vendorAuthenticated: boolean;
  /** Which branch a multi-branch owner/staff member is currently viewing. */
  activeBranchId: string | null;
  setActiveBranchId: (branchId: string | null) => void;

  // ── Account domain ────────────────────────────────────────────────────────
  addresses: SavedAddress[];
  walletBalance: number;
  walletTransactions: WalletTransaction[];
  invoices: StoredInvoice[];
  documents: VaultDocument[];

  addAddress: (input: Omit<SavedAddress, 'id' | 'createdAt' | 'isDefault'> & { isDefault?: boolean }) => SavedAddress;
  updateAddress: (id: string, patch: Partial<Omit<SavedAddress, 'id' | 'createdAt'>>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  /** Credits the wallet and records the entry. Returns the new balance. */
  topUpWallet: (amount: number, method: string) => number;
  /**
   * Debits the wallet for a booking. Returns false without recording anything
   * when the balance is insufficient — the caller must fall back to a card.
   */
  chargeWallet: (amount: number, description: string, bookingId?: string) => boolean;
  refundToWallet: (amount: number, description: string, bookingId?: string) => void;

  addInvoice: (input: Omit<StoredInvoice, 'id' | 'number' | 'issuedAt'> & { issuedAt?: string }) => StoredInvoice;

  addDocument: (input: Omit<VaultDocument, 'id' | 'addedAt'>) => VaultDocument;
  removeDocument: (id: string) => void;
  renameDocument: (id: string, title: string) => void;

  /**
   * Wipe everything belonging to the signed-in person, for sign-out.
   * Device preferences (theme, language) deliberately survive — they are
   * settings for the device, not personal data.
   */
  clearPersonalData: () => void;

  toggleFavoriteGarage: (garageId: string) => boolean;
  createQuoteRequest: (input: Pick<QuoteRequest, 'issue' | 'vehicle'>) => QuoteRequest;
  createBooking: (input: BookingCreateInput) => Booking;
  cancelBooking: (id: string) => void;
  rescheduleBooking: (id: string, input: { date: string; bookingDate?: string; timeSlot?: string }) => void;
  markNotificationsRead: () => void;
  setLanguage: (language: 'en' | 'ar') => void;
  setThemeMode: (mode: QarThemeMode) => void;
  /** Records an explicit onboarding theme choice. */
  chooseThemeMode: (mode: QarThemeMode) => void;
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

export const useQarWheelStore = create<QarWheelState>()(
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
      themeChosen: false,
      vendorAuthenticated: false,
      activeBranchId: null,
      setActiveBranchId: (branchId) => set({ activeBranchId: branchId }),

      // ── Account domain ──────────────────────────────────────────────────
      // Starts genuinely empty. A new account has no addresses, no balance and
      // no paperwork; showing invented ones taught users to distrust the
      // numbers.
      addresses: [],
      walletBalance: 0,
      walletTransactions: [],
      invoices: [],
      documents: [],

      addAddress: (input) => {
        const existing = get().addresses;
        const address: SavedAddress = {
          id: makeId('addr'),
          label: input.label.trim() || 'Address',
          line: input.line.trim(),
          area: input.area.trim(),
          instructions: input.instructions?.trim() || undefined,
          // First address saved is the default, regardless of the flag.
          isDefault: input.isDefault ?? existing.length === 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          addresses: address.isDefault
            ? [...state.addresses.map((a) => ({ ...a, isDefault: false })), address]
            : [...state.addresses, address],
        }));
        return address;
      },

      updateAddress: (id, patch) =>
        set((state) => ({
          addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      removeAddress: (id) =>
        set((state) => {
          const remaining = state.addresses.filter((a) => a.id !== id);
          // Never leave the list without a default.
          if (remaining.length && !remaining.some((a) => a.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { addresses: remaining };
        }),

      setDefaultAddress: (id) =>
        set((state) => ({
          addresses: state.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        })),

      topUpWallet: (amount, method) => {
        const rounded = Math.round(amount * 100) / 100;
        const balance = Math.round((get().walletBalance + rounded) * 100) / 100;
        const txn: WalletTransaction = {
          id: makeId('txn'),
          kind: 'topup',
          amount: rounded,
          description: `Wallet top-up · ${method}`,
          balanceAfter: balance,
          createdAt: new Date().toISOString(),
          method,
          reference: makeReference('TOP'),
        };
        set((state) => ({
          walletBalance: balance,
          walletTransactions: [txn, ...state.walletTransactions],
        }));
        return balance;
      },

      chargeWallet: (amount, description, bookingId) => {
        const rounded = Math.round(amount * 100) / 100;
        const current = get().walletBalance;
        if (rounded <= 0 || current < rounded) return false;

        const balance = Math.round((current - rounded) * 100) / 100;
        const txn: WalletTransaction = {
          id: makeId('txn'),
          kind: 'payment',
          amount: -rounded,
          description,
          balanceAfter: balance,
          createdAt: new Date().toISOString(),
          bookingId,
          method: 'Wallet',
          reference: makeReference('PAY'),
        };
        set((state) => ({
          walletBalance: balance,
          walletTransactions: [txn, ...state.walletTransactions],
        }));
        return true;
      },

      refundToWallet: (amount, description, bookingId) => {
        const rounded = Math.round(amount * 100) / 100;
        if (rounded <= 0) return;
        const balance = Math.round((get().walletBalance + rounded) * 100) / 100;
        const txn: WalletTransaction = {
          id: makeId('txn'),
          kind: 'refund',
          amount: rounded,
          description,
          balanceAfter: balance,
          createdAt: new Date().toISOString(),
          bookingId,
          method: 'Wallet',
          reference: makeReference('REF'),
        };
        set((state) => ({
          walletBalance: balance,
          walletTransactions: [txn, ...state.walletTransactions],
        }));
      },

      addInvoice: (input) => {
        const issuedAt = input.issuedAt ?? new Date().toISOString();
        const year = new Date(issuedAt).getFullYear();
        const seq = get().invoices.length + 1;
        const invoice: StoredInvoice = {
          ...input,
          id: makeId('inv'),
          number: `INV-${year}-${String(seq).padStart(4, '0')}`,
          issuedAt,
        };
        set((state) => ({ invoices: [invoice, ...state.invoices] }));
        return invoice;
      },

      addDocument: (input) => {
        const document: VaultDocument = {
          ...input,
          id: makeId('doc'),
          addedAt: new Date().toISOString(),
        };
        set((state) => ({ documents: [document, ...state.documents] }));
        return document;
      },

      removeDocument: (id) =>
        set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

      renameDocument: (id, title) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, title } : d)),
        })),

      clearPersonalData: () =>
        set({
          // Identity documents, money and addresses must not survive into the
          // next account on a shared device.
          documents: [],
          addresses: [],
          walletBalance: 0,
          walletTransactions: [],
          invoices: [],
          bookings: [],
          quoteRequests: [],
          favoriteGarageIds: [],
          notifications: [],
          vendorAuthenticated: false,
          activeBranchId: null,
        }),

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
          id: makeId('quote'),
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
        const bookingId = makeId('booking');
        const vendorBookingId = makeId('vb_user');
        const booking: Booking = {
          ...input,
          id: bookingId,
          vendorBookingId,
          status: input.status ?? 'Pending',
        };
        const vendorBooking: VendorBooking = {
          id: vendorBookingId,
          customerName: input.customerName ?? 'QarWheel Customer',
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
                id: makeId(`notif_cancel_${id}`),
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
                id: makeId(`notif_reschedule_${id}`),
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
      chooseThemeMode: (themeMode) => set({ themeMode, themeChosen: true }),
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
              id: makeId(`notif_status_${id}`),
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
        const staff: VendorStaff = { ...staffData, id: makeId('staff') };
        set((state) => ({ vendorStaff: [...state.vendorStaff, staff] }));
        return staff;
      },
      addVendorInventoryItem: (itemData) => {
        const item: VendorInventoryItem = {
          ...itemData,
          id: makeId('inv_item'),
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
            id: makeId('li'),
            description: booking.service,
            type: 'service',
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
          },
        ];
        const invoice: VendorInvoice = {
          id: makeId('inv'),
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
              id: makeId('li'),
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
        const service: VendorService = { ...serviceData, id: makeId('svc') };
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
          id: makeId('offer'),
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
          id: makeId('promo'),
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
      name: 'qarwheel-store-v2',
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
        themeChosen: state.themeChosen,
        vendorAuthenticated: state.vendorAuthenticated,
        activeBranchId: state.activeBranchId,
        addresses: state.addresses,
        walletBalance: state.walletBalance,
        walletTransactions: state.walletTransactions,
        invoices: state.invoices,
        documents: state.documents,
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
  const themeMode = useQarWheelStore((s) => s.themeMode);
  return getQarColors(themeMode);
}
