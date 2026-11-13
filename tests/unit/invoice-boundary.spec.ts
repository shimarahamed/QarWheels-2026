import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  allowed: true,
  booking: {
    branchId: 'branch_1', businessId: 'business_1', status: 'Completed', userId: 'customer_1',
    requiresQuote: false,
    quote: { status: 'Offered', acceptedBy: 'customer_1', amountMinorUnits: 10000 },
  },
  branchBusinessId: 'business_1',
  bookingReads: vi.fn(),
  invoiceReads: vi.fn(),
  invoiceExists: true,
  legacyInvoiceExists: false,
  invoiceBusinessId: 'business_1',
  createInvoice: vi.fn(),
}));
vi.mock('@/lib/auth/require-role', () => ({
  requireSection: async () => mocks.allowed
    ? { ok: true, auth: { user: { uid: 'vendor_1' }, role: 'vendor_manager', claims: { r: 'vendor_manager', b: 'business_1' } } }
    : { ok: false, reason: 'unauthenticated' },
  requireBranchAccess: async () => ({ ok: true, auth: { user: { uid: 'vendor_1' }, role: 'vendor_manager', claims: { r: 'vendor_manager', b: 'business_1' } } }),
}));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({ doc: () => ({
      get: async () => {
        if (name === 'bookings') {
          mocks.bookingReads();
          return { exists: true, data: () => mocks.booking };
        }
        if (name === 'invoices') {
          mocks.invoiceReads();
          return { exists: mocks.invoiceExists, id: 'booking_1', data: () => ({
            bookingId: 'booking_1', branchId: 'branch_1', businessId: mocks.invoiceBusinessId,
          }) };
        }
        return { exists: true, get: () => mocks.branchBusinessId };
      },
    }), where: () => ({ limit: () => ({ get: async () => ({ docs: mocks.legacyInvoiceExists ? [{
      exists: true, id: 'legacy_invoice', data: () => ({
        bookingId: 'booking_1', branchId: 'branch_1', businessId: mocks.invoiceBusinessId,
      }),
    }] : [] }) }) }) }),
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: async () => 'test',
  isRateLimited: async () => false,
  API_LIMITS: { invoiceCreate: {} },
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn(), trackRateLimit: vi.fn() }));
vi.mock('@/lib/invoice-creation', () => ({ createInvoiceOnce: mocks.createInvoice }));

import { GET, POST } from '@/app/api/vendor/invoices/route';

const request = () => new NextRequest('http://localhost/api/vendor/invoices', {
  method: 'POST',
  body: JSON.stringify({
    bookingId: 'booking_1',
    lineItems: [{ description: 'Service', quantity: 1, unitPriceMinorUnits: 10000 }],
  }),
});

describe('invoice creation boundary', () => {
  beforeEach(() => {
    mocks.allowed = true;
    mocks.booking.status = 'Completed';
    mocks.booking.requiresQuote = false;
    mocks.booking.quote = { status: 'Offered', acceptedBy: 'customer_1', amountMinorUnits: 10000 };
    mocks.branchBusinessId = 'business_1';
    mocks.bookingReads.mockClear();
    mocks.invoiceReads.mockClear();
    mocks.invoiceExists = true;
    mocks.legacyInvoiceExists = false;
    mocks.invoiceBusinessId = 'business_1';
    mocks.createInvoice.mockClear();
  });

  it('does not reveal whether a booking exists to an unauthenticated caller', async () => {
    mocks.allowed = false;
    expect((await POST(request())).status).toBe(401);
    expect(mocks.bookingReads).not.toHaveBeenCalled();
  });

  it('rejects a booking whose branch belongs to another business', async () => {
    mocks.branchBusinessId = 'business_2';
    expect((await POST(request())).status).toBe(403);
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('does not create a final invoice for an unfinished booking', async () => {
    mocks.booking.status = 'Pending';
    expect((await POST(request())).status).toBe(400);
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('allows an authorized completed booking in the same business', async () => {
    mocks.createInvoice.mockResolvedValue({ id: 'invoice_1', invoiceNumber: 'INV-1' });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.createInvoice).toHaveBeenCalledOnce();
  });

  it('requires customer acceptance for a quote-based booking', async () => {
    mocks.booking.requiresQuote = true;
    expect((await POST(request())).status).toBe(400);
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a different total from the accepted quote', async () => {
    mocks.booking.requiresQuote = true;
    mocks.booking.quote.status = 'Accepted';
    mocks.booking.quote.amountMinorUnits = 9000;
    expect((await POST(request())).status).toBe(400);
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('allows an invoice for the exact customer-accepted amount', async () => {
    mocks.booking.requiresQuote = true;
    mocks.booking.quote.status = 'Accepted';
    mocks.createInvoice.mockResolvedValue({ id: 'invoice_1', invoiceNumber: 'INV-1' });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.createInvoice).toHaveBeenCalledOnce();
  });

  it('does not look up an invoice before authenticating', async () => {
    mocks.allowed = false;
    expect((await GET(new NextRequest('http://localhost/api/vendor/invoices?bookingId=booking_1'))).status).toBe(401);
    expect(mocks.invoiceReads).not.toHaveBeenCalled();
  });

  it('returns a single authorized invoice without listing the business', async () => {
    const response = await GET(new NextRequest('http://localhost/api/vendor/invoices?bookingId=booking_1'));
    expect(response.status).toBe(200);
    expect((await response.json()).data.invoice).toMatchObject({ id: 'booking_1', businessId: 'business_1' });
    expect(mocks.invoiceReads).toHaveBeenCalledOnce();
  });

  it('does not reveal an invoice from another business', async () => {
    mocks.invoiceBusinessId = 'business_2';
    const response = await GET(new NextRequest('http://localhost/api/vendor/invoices?bookingId=booking_1'));
    expect((await response.json()).data.invoice).toBeNull();
  });

  it('returns an empty result when no invoice exists yet', async () => {
    mocks.invoiceExists = false;
    const response = await GET(new NextRequest('http://localhost/api/vendor/invoices?invoiceId=booking_1'));
    expect((await response.json()).data.invoice).toBeNull();
  });

  it('finds an older invoice by booking ID without listing unrelated invoices', async () => {
    mocks.invoiceExists = false;
    mocks.legacyInvoiceExists = true;
    const response = await GET(new NextRequest('http://localhost/api/vendor/invoices?bookingId=booking_1'));
    expect((await response.json()).data.invoice).toMatchObject({ id: 'legacy_invoice', bookingId: 'booking_1' });
  });
});
