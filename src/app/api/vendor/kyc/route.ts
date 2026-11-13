import { type NextRequest } from 'next/server';
import { KycSubmitSchema } from '@/lib/schemas';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAction } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';

// Vendor KYC submission — the ONLY write path for businesses/{id}.kyc.
// Firestore rules lock the whole kyc field out from client writes (a vendor
// could otherwise self-approve by setting kyc.status:'Verified' directly);
// this route always forces status back to 'Pending' on submission. Approval
// happens exclusively via /api/admin/kyc/[businessId] (master-admin only).
export async function POST(request: NextRequest) {
  const access = await requireAction(request, 'business.submitKyc');
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

  // documentPaths must live under this caller's own business prefix. Without
  // this, a business_owner could submit another business's Storage path
  // (e.g. one they enumerated or guessed) and have it stored as their own
  // KYC evidence — the admin review route (documents/route.ts) would then
  // mint a live signed URL for it, handing them another tenant's compliance
  // documents. Enforced again there as a second, independent check.
  const requiredPrefix = `kyc/${businessId}/`;
  const invalidPath = documentPaths.find((p) => !p.startsWith(requiredPrefix));
  if (invalidPath) {
    return Errors.badRequest('One or more document paths are invalid for this business');
  }

  try {
    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const now = new Date().toISOString();
    const fullIban = iban.toUpperCase();
    const privateRef = db.collection('businesses_private').doc(businessId);
    const result = await db.runTransaction(async (tx) => {
      const businessSnap = await tx.get(businessRef);
      if (!businessSnap.exists) return 'missing' as const;
      // shortcut: one KYC resubmission supports up to 498 listed branches; use a staged job for larger tenants.
      const listed = await tx.get(db.collection('branches')
        .where('businessId', '==', businessId).where('isListed', '==', true).limit(499));
      if (listed.size >= 499) return 'tooMany' as const;
      tx.update(businessRef, {
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
      });
      for (const branch of listed.docs) tx.update(branch.ref, { isListed: false, updatedAt: now });
      // Full IBAN + bank name live only here — an Admin-SDK-only document
      // with no Firestore rule granting any client access (see the
      // businesses_private/** block in firestore.rules). Phase 3's payout
      // system reads from this doc, not from businesses/{id}.kyc.
      tx.set(privateRef,
        { bankName: bankName ?? '', iban: fullIban, updatedAt: now },
        { merge: true },
      );
      return 'updated' as const;
    });
    if (result === 'missing') return Errors.notFound('Business');
    if (result === 'tooMany') return err('Too many listed branches for an atomic KYC resubmission.', 409);

    return ok({ status: 'Pending' as const, submittedAt: now });
  } catch (error) {
    trackApiError('/api/vendor/kyc', error);
    return Errors.serverError();
  }
}
