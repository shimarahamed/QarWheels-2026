import { type NextRequest } from 'next/server';
import { KycSubmitSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { trackApiError } from '@/lib/observability';

// Vendor KYC submission — the ONLY write path for the vendors/{uid}.kyc map.
// Firestore rules lock the whole kyc field out from client writes (a vendor
// could otherwise self-approve by setting kyc.status:'Verified' directly);
// this route always forces status back to 'Pending' on submission. Approval
// happens exclusively via the admin review route in a later phase.
export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

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

  const { crNumber, licenseNumber, bankName, iban, documentUrls } = parsed.data;

  try {
    const db = getAdminFirestore();
    const vendorRef = db.collection('vendors').doc(user.uid);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists) return Errors.notFound('Vendor');

    const now = new Date().toISOString();
    await vendorRef.update({
      'kyc.crNumber': crNumber,
      'kyc.licenseNumber': licenseNumber,
      'kyc.bankName': bankName ?? '',
      'kyc.iban': iban.toUpperCase(),
      'kyc.documentUrls': documentUrls,
      'kyc.status': 'Pending',
      'kyc.submittedAt': now,
      updatedAt: now,
    });

    return ok({ status: 'Pending' as const, submittedAt: now });
  } catch (error) {
    trackApiError('/api/vendor/kyc', error);
    return Errors.serverError();
  }
}
