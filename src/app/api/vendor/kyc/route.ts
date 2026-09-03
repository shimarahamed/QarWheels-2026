import { type NextRequest } from 'next/server';
import { KycSubmitSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';

// Vendor KYC submission — the ONLY write path for businesses/{id}.kyc.
// Firestore rules lock the whole kyc field out from client writes (a vendor
// could otherwise self-approve by setting kyc.status:'Verified' directly);
// this route always forces status back to 'Pending' on submission. Approval
// happens exclusively via /api/admin/kyc/[businessId] (master-admin only).
export async function POST(request: NextRequest) {
  const access = await requireRole(request, ['business_owner', 'business_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;
  if (!auth.claims || auth.claims.r === 'master_admin') return Errors.forbidden();
  const businessId = auth.claims.b;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }

  const parsed = KycSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }

  const { crNumber, licenseNumber, bankName, iban, documentPaths } = parsed.data;

  try {
    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) return Errors.notFound('Business');

    const now = new Date().toISOString();
    const fullIban = iban.toUpperCase();

    await Promise.all([
      businessRef.update({
        'kyc.crNumber': crNumber,
        'kyc.licenseNumber': licenseNumber,
        'kyc.bankName': bankName ?? '',
        // Full IBAN never lives in the client-readable document — only the
        // last 4 digits do, matching the Business.kyc.ibanLast4 shape.
        'kyc.ibanLast4': fullIban.slice(-4),
        'kyc.documentPaths': documentPaths,
        'kyc.status': 'Pending',
        'kyc.submittedAt': now,
        'kyc.rejectionReason': null,
        updatedAt: now,
      }),
      // Full IBAN + bank name live only here — an Admin-SDK-only document
      // with no Firestore rule granting any client access (see the
      // businesses_private/** block in firestore.rules). Phase 3's payout
      // system reads from this doc, not from businesses/{id}.kyc.
      db.collection('businesses_private').doc(businessId).set(
        { bankName: bankName ?? '', iban: fullIban, updatedAt: now },
        { merge: true },
      ),
    ]);

    return ok({ status: 'Pending' as const, submittedAt: now });
  } catch (error) {
    trackApiError('/api/vendor/kyc', error);
    return Errors.serverError();
  }
}
