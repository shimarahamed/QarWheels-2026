import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole, requireBranchAccess } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';
import type { Booking, Invoice, InvoiceLineItem, WithId } from '@/lib/types';

const LineItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(999),
  unitPriceMinorUnits: z.number().int().min(0),
});

const CreateInvoiceSchema = z.object({
  bookingId: z.string().min(1),
  lineItems: z.array(LineItemSchema).min(1).max(50),
  taxMinorUnits: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
});

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
    const invoices: WithId<Invoice>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Invoice) }));
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

    const existing = await db.collection('invoices').where('bookingId', '==', bookingId).limit(1).get();
    if (!existing.empty) {
      return Errors.badRequest('An invoice already exists for this booking');
    }

    const subtotalMinorUnits = lineItems.reduce(
      (sum: number, item: InvoiceLineItem) => sum + item.quantity * item.unitPriceMinorUnits,
      0,
    );
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
      totalMinorUnits: subtotalMinorUnits + taxMinorUnits,
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
