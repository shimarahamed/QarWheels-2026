import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole, requireBranchAccess } from '@/lib/auth/require-role';
import { claimsCoverBranch } from '@/lib/auth/qw-claims';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
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
  const access = await requireRole(request, ['business_owner', 'business_admin', 'branch_manager', 'branch_staff', 'master_admin']);
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

    // branch_manager/branch_staff only see their own branch(es)' invoices —
    // business_owner/business_admin/master_admin see the whole business.
    if (auth.role === 'branch_manager' || auth.role === 'branch_staff') {
      invoices = invoices.filter((inv) => auth.claims && claimsCoverBranch(auth.claims, inv.branchId));
    }

    return ok({ invoices });
  } catch (error) {
    trackApiError('/api/vendor/invoices GET', error);
    return Errors.serverError();
  }
}

/** INV-YYYY-NNNN, sequential within the calendar year per business. */
async function nextInvoiceNumber(
  db: FirebaseFirestore.Firestore,
  businessId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await db.collection('invoices')
    .where('businessId', '==', businessId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let next = 1;
  const latest = snap.docs[0]?.data() as Invoice | undefined;
  if (latest?.invoiceNumber?.startsWith(`INV-${year}-`)) {
    const parsed = Number.parseInt(latest.invoiceNumber.split('-')[2] ?? '0', 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }
  return `INV-${year}-${String(next).padStart(4, '0')}`;
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
    const db = getAdminFirestore();
    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) return Errors.notFound('Booking');
    const booking = bookingSnap.data() as Booking;

    // Authorised against the booking's own branch, so staff can only invoice
    // work at a branch they actually belong to.
    const access = await requireBranchAccess(request, booking.branchId);
    if (!access.ok) {
      return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
    }

    const rateLimitKey = await getRateLimitKey('vendor:invoice-create', access.auth.user.uid);
    if (await isRateLimited(rateLimitKey, API_LIMITS.invoiceCreate)) {
      trackRateLimit('vendor:invoice-create', rateLimitKey);
      return Errors.rateLimited();
    }

    const existing = await db.collection('invoices').where('bookingId', '==', bookingId).limit(1).get();
    if (!existing.empty) {
      return Errors.badRequest('An invoice already exists for this booking');
    }

    const subtotalMinorUnits = lineItems.reduce(
      (sum: number, item: InvoiceLineItem) => sum + item.quantity * item.unitPriceMinorUnits,
      0,
    );
    const totalMinorUnits = subtotalMinorUnits + taxMinorUnits;

    // Reconcile against what the customer actually booked and agreed to pay.
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
    const invoiceNumber = await nextInvoiceNumber(db, booking.businessId);

    const invoice: Invoice = {
      businessId: booking.businessId,
      branchId: booking.branchId,
      bookingId,
      invoiceNumber,
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

    const ref = await db.collection('invoices').add(invoice);
    return ok({ invoiceId: ref.id, invoiceNumber, totalMinorUnits: invoice.totalMinorUnits });
  } catch (error) {
    trackApiError('/api/vendor/invoices POST', error);
    return Errors.serverError();
  }
}
