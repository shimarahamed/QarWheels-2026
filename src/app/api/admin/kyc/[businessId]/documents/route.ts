import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { trackApiError } from '@/lib/observability';
import type { Business } from '@/lib/types';

const SIGNED_URL_TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough to review, short-lived by design

// Mints short-lived signed URLs for a business's KYC documents, from the
// storage paths in businesses/{id}.kyc.documentPaths — never the client's
// own getDownloadURL() output, which would embed a token that outlives this
// review session and bypasses Storage rules for anyone who gets the link.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('businesses').doc(businessId).get();
    if (!snap.exists) return Errors.notFound('Business');
    const business = snap.data() as Business;
    const allPaths = business.kyc?.documentPaths ?? [];

    // Defence in depth: only ever sign a path that actually lives under this
    // business's own KYC prefix, regardless of what's stored on the doc.
    // Prevents a stray/legacy/tampered path from a different business ever
    // being handed out as a live signed URL during review.
    const requiredPrefix = `kyc/${businessId}/`;
    const paths = allPaths.filter((path) => path.startsWith(requiredPrefix));
    if (paths.length !== allPaths.length) {
      trackApiError('/api/admin/kyc/[businessId]/documents', new Error(
        `businessId=${businessId} has ${allPaths.length - paths.length} documentPaths outside its own prefix — refused to sign`,
      ));
    }

    const bucket = getAdminStorage().bucket();
    const urls = await Promise.all(
      paths.map(async (path) => {
        const [url] = await bucket.file(path).getSignedUrl({
          action: 'read',
          expires: Date.now() + SIGNED_URL_TTL_MS,
        });
        return { path, url };
      }),
    );

    return ok({ documents: urls, expiresInMs: SIGNED_URL_TTL_MS });
  } catch (error) {
    trackApiError('/api/admin/kyc/[businessId]/documents', error);
    return Errors.serverError();
  }
}
