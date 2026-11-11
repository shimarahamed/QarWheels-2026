import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireSection, requireBranchAccess } from '@/lib/auth/require-role';
import { claimsCoverBranch } from '@/lib/auth/qw-claims';
import { isBusinessWideRole } from '@/lib/auth/permissions';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import { createInvoiceOnce } from '@/lib/invoice-creation';
import type { Booking, Invoice, InvoiceLineItem, WithId } from '@/lib/types';

// Upper bounds are defence-in-depth, not the primary control — the primary
// control is the reconciliation against booking.cost below. QAR 1,000,000
// (100,000,000 fils) is far above any plausible single line item; it exists
// only to keep a typo or a malicious payload from producing an unbounded
// number that could misbehave downstream (invoicing UI, ledger, exports).
const MAX_LINE_ITEM_MINOR_UNITS = 100_000_000;

const LineItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(999),
  unitPriceMinorUnits: z.number().int().min(0).max(MAX_LINE_ITEM_MINOR_UNITS),
});

const CreateInvoiceSchema = z.object({
  bookingId: z.string().min(1),
  lineItems: z.array(LineItemSchema).min(1).max(50),
  taxMinorUnits: z.number().int().min(0).max(MAX_LINE_ITEM_MINOR_UNITS).default(0),
  notes: z.string().max(1000).optional(),
});

// How far an invoice total may exceed the booking's quoted cost before it's
// rejected outright. Real jobs legitimately grow (extra parts, more labor
// than quoted), so this isn't a hard equality check — but it stops a branch
// account from invoicing a customer for an arbitrary, unbounded amount that
// has no relationship to the job the customer actually booked and agreed to.
// cost is stored in whole QAR on Booking; convert to minor units (fils) to
// compare against the invoice, which is minor-units throughout.
const MAX_OVERAGE_RATIO = 3; // invoice may be up to 3x the quoted cost
const MAX_OVERAGE_FLAT_MINOR_UNITS = 50_000 * 100; // ...or +QAR 50,000, whichever is larger

export async function GET(request: NextRequest) {
  const access = await requireSection(request, 'invoices');
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;

  const url = new URL(request.url);
  const requestedBusinessId = url.searchParams.get('businessId');
  const businessId = auth.role === 'master_admin'
    ? requestedBusinessId
    : (auth.claims && auth.claims.r !== 'master_admin' ? auth.claims.b : null);
  if (!businessId) return Errors.badRequest('businessId is required');

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('invoices')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    let invoices: WithId<Invoice>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Invoice) }));

    // Branch-scoped roles only see invoices from the branches on their claim;
    // the business-wide roles (and master_admin) see all of them.
    const isBranchScoped =
      auth.role !== 'master_admin' &&
      auth.claims !== null &&
      auth.claims.r !== 'master_admin' &&
      !isBusinessWideRole(auth.claims.r);
    if (isBranchScoped) {
      invoices = invoices.filter((inv) => auth.claims && claimsCoverBranch(auth.claims, inv.branchId));
    }

    return ok({ invoices });
  } catch (error) {
    trackApiError('/api/vendor/invoices GET', error);
    return Errors.serverError();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { bookingId, lineItems, taxMinorUnits, notes } = parsed.data;

  try {
    const permitted = await requireSection(request, 'invoices', 'write');
    if (!permitted.ok) {
      return permitted.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
    }

    const db = getAdminFirestore();
    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) return Errors.notFound('Booking');
    const booking = bookingSnap.data() as Booking;

    const access = await requireBranchAccess(request, booking.branchId);
    if (!access.ok) {
      return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
    }
    const branch = await db.collection('branches').doc(booking.branchId).get();
    if (!branch.exists || branch.get('businessId') !== booking.businessId) return Errors.forbidden();
    if (booking.status !== 'Completed') return Errors.badRequest('Only completed bookings can be invoiced');

    const rateLimitKey = await getRateLimitKey('vendor:invoice-create', access.auth.user.uid);
    if (await isRateLimited(rateLimitKey, API_LIMITS.invoiceCreate)) {
      trackRateLimit('vendor:invoice-create', rateLimitKey);
      return Errors.rateLimited();
    }

    const subtotalMinorUnits = lineItems.reduce(
      (sum: number, item: InvoiceLineItem) => sum + item.quantity * item.unitPriceMinorUnits,
      0,
    );
    const totalMinorUnits = subtotalMinorUnits + taxMinorUnits;

    if (booking.requiresQuote) {
      const quote = booking.quote;
      if (!quote || quote.status !== 'Accepted' || quote.acceptedBy !== booking.userId) {
        return Errors.badRequest('The customer must accept a garage quote before an invoice can be issued');
      }
      if (totalMinorUnits !== quote.amountMinorUnits) {
        return Errors.badRequest('Invoice total must match the amount accepted by the customer');
      }
    }

    // shortcut: this sanity ceiling is not customer quote acceptance; require
    // an accepted server-owned quote before treating an invoice as a charge.
    // booking.cost is whole QAR; invoices are minor units (fils) — convert
    // before comparing. Real jobs can legitimately exceed the quote (extra
    // parts, more labor), so this isn't equality — it's a ceiling that stops
    // an invoice from being unmoored from the booking it's attached to.
    if (typeof booking.cost === 'number' && booking.cost > 0) {
      const quotedMinorUnits = Math.round(booking.cost * 100);
      const ceiling = Math.max(
        quotedMinorUnits * MAX_OVERAGE_RATIO,
        quotedMinorUnits + MAX_OVERAGE_FLAT_MINOR_UNITS,
      );
      if (totalMinorUnits > ceiling) {
        return Errors.badRequest(
          `Invoice total is far above the booking's quoted cost (QAR ${booking.cost}). ` +
          'If the job genuinely grew this much, contact support.',
        );
      }
    }

    const now = new Date().toISOString();
    const invoice: Omit<Invoice, 'invoiceNumber'> = {
      businessId: booking.businessId,
      branchId: booking.branchId,
      bookingId,
      userId: booking.userId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      lineItems,
      subtotalMinorUnits,
      taxMinorUnits,
      totalMinorUnits,
      currency: 'QAR',
      status: 'Sent',
      issuedAt: now,
      ...(notes ? { notes } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const created = await createInvoiceOnce(db, invoice);
    return ok({ ...created, totalMinorUnits: invoice.totalMinorUnits });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVOICE_ALREADY_EXISTS') {
      return Errors.badRequest('An invoice already exists for this booking');
    }
    trackApiError('/api/vendor/invoices POST', error);
    return Errors.serverError();
  }
}
