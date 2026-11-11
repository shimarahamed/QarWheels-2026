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
  createInvoice: vi.fn(),
}));
vi.mock('@/lib/auth/require-role', () => ({
  requireSection: async () => mocks.allowed
    ? { ok: true, auth: { user: { uid: 'vendor_1' } } }
    : { ok: false, reason: 'unauthenticated' },
  requireBranchAccess: async () => ({ ok: true, auth: { user: { uid: 'vendor_1' } } }),
}));
vi.mock('@/lib/firebase-admin', () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => ({ doc: () => ({
      get: async () => {
        if (name === 'bookings') {
          mocks.bookingReads();
          return { exists: true, data: () => mocks.booking };
        }
        return { exists: true, get: () => mocks.branchBusinessId };
      },
    }) }),
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  getRateLimitKey: async () => 'test',
  isRateLimited: async () => false,
  API_LIMITS: { invoiceCreate: {} },
}));
vi.mock('@/lib/observability', () => ({ trackApiError: vi.fn(), trackRateLimit: vi.fn() }));
vi.mock('@/lib/invoice-creation', () => ({ createInvoiceOnce: mocks.createInvoice }));

import { POST } from '@/app/api/vendor/invoices/route';

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
});
