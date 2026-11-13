// Live payouts + invoices data for the vendor and customer screens.
//
// These types mirror the server contracts in src/app/api/vendor/payouts and
// src/app/api/vendor/invoices. Mobile has no build-time link to src/, so they
// are kept in sync by hand — the same arrangement already used by
// booking-workflow.ts and roles.ts.
//
// All money fields are integer MINOR UNITS (fils). Format with lib/money.ts.
import { auth } from './firebase';
import { apiGet, apiPost } from './api';

export type PayoutStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';
export type TransactionStatus = 'Pending' | 'Settled' | 'Refunded';

export type LiveTransaction = {
  id: string;
  businessId: string;
  branchId: string;
  bookingId: string;
  customerName: string;
  serviceName: string;
  grossMinorUnits: number;
  commissionMinorUnits: number;
  netMinorUnits: number;
  currency: string;
  status: TransactionStatus;
  payoutId?: string;
  createdAt: string;
};

export type LivePayout = {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  grossMinorUnits: number;
  platformFeeMinorUnits: number;
  netMinorUnits: number;
  currency: string;
  status: PayoutStatus;
  transactionIds: string[];
  requestedAt: string;
  requestedBy: string;
  paidAt?: string;
  providerTransferId?: string;
  failureReason?: string;
};

export type AvailableBalance = {
  transactionCount: number;
  grossMinorUnits: number;
  commissionMinorUnits: number;
  netMinorUnits: number;
  currency: string;
};

export type PayoutsPayload = {
  payouts: LivePayout[];
  available: AvailableBalance;
  transactions: LiveTransaction[];
  paymentsLive: boolean;
};

export type LiveInvoiceLineItem = {
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
};

export type LiveInvoice = {
  id: string;
  businessId: string;
  branchId: string;
  bookingId: string;
  invoiceNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  lineItems: LiveInvoiceLineItem[];
  subtotalMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

async function token(): Promise<string | null> {
  return (await auth.currentUser?.getIdToken()) ?? null;
}

export async function fetchPayouts(businessId: string): Promise<PayoutsPayload> {
  return apiGet<PayoutsPayload>(`/api/vendor/payouts?businessId=${encodeURIComponent(businessId)}`, await token());
}

export type RequestPayoutResult = {
  payoutId: string;
  netMinorUnits: number;
  status: PayoutStatus;
  paymentsLive: boolean;
};

/**
 * The route rejects with a readable message when KYC isn't Verified, when
 * nothing is available, or when below the minimum — callers surface it as-is.
 */
export async function requestPayout(): Promise<RequestPayoutResult> {
  return apiPost<RequestPayoutResult>('/api/vendor/payouts/request', await token(), {});
}

export async function fetchInvoices(businessId: string): Promise<LiveInvoice[]> {
  const data = await apiGet<{ invoices: LiveInvoice[] }>(
    `/api/vendor/invoices?businessId=${encodeURIComponent(businessId)}`,
    await token(),
  );
  return data.invoices;
}

export async function fetchInvoice(invoiceId: string): Promise<LiveInvoice | null> {
  const data = await apiGet<{ invoice: LiveInvoice | null }>(
    `/api/vendor/invoices?invoiceId=${encodeURIComponent(invoiceId)}`, await token(),
  );
  return data.invoice;
}

export async function fetchBookingInvoice(bookingId: string): Promise<LiveInvoice | null> {
  const data = await apiGet<{ invoice: LiveInvoice | null }>(
    `/api/vendor/invoices?bookingId=${encodeURIComponent(bookingId)}`, await token(),
  );
  return data.invoice;
}

export type CreateInvoiceResult = {
  invoiceId: string;
  invoiceNumber: string;
  totalMinorUnits: number;
};

export async function createInvoice(input: {
  bookingId: string;
  lineItems: LiveInvoiceLineItem[];
  taxMinorUnits?: number;
  notes?: string;
}): Promise<CreateInvoiceResult> {
  return apiPost<CreateInvoiceResult>('/api/vendor/invoices', await token(), input);
}

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, { bg: string; text: string }> = {
  Pending: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  Processing: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  Paid: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
  Failed: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string }> = {
  Draft: { bg: 'rgba(168,176,186,0.15)', text: '#A8B0BA' },
  Sent: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  Paid: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
  Void: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
};

/** ISO string -> "01 Jun 2026"; tolerant of the missing/!string case. */
export function formatBillingDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
