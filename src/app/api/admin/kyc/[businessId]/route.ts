import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { writeAuditLog } from '@/lib/audit';
import { trackApiError } from '@/lib/observability';
import type { Business } from '@/lib/types';

const ReviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(500).optional(),
});

// The only path that can ever set businesses/{id}.kyc.status to 'Verified'
// or 'Rejected' — closes the Phase 0 fix: no client, on any platform, can
// write kyc.status directly (firestore.rules locks the whole kyc map out
// of client updates). On approval, also flips isListed=true on every
// Approved branch of the business so it becomes visible in the customer
// marketplace.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { decision, rejectionReason } = parsed.data;

  if (decision === 'reject' && !rejectionReason) {
    return Errors.badRequest('rejectionReason is required when rejecting');
  }

  try {
    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) return Errors.notFound('Business');
    const before = businessSnap.data() as Business;

    const now = new Date().toISOString();
    const newStatus = decision === 'approve' ? 'Verified' : 'Rejected';

    await businessRef.update({
      'kyc.status': newStatus,
      'kyc.reviewedAt': now,
      'kyc.reviewedBy': access.auth.user.uid,
      'kyc.rejectionReason': decision === 'reject' ? rejectionReason : null,
      updatedAt: now,
    });

    if (decision === 'approve') {
      const branchesSnap = await db.collection('branches')
        .where('businessId', '==', businessId)
        .where('status', '==', 'Approved')
        .get();
      if (!branchesSnap.empty) {
        const batch = db.batch();
        for (const doc of branchesSnap.docs) {
          batch.update(doc.ref, { isListed: true, updatedAt: now });
        }
        await batch.commit();
      }
    }

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      businessId,
      action: decision === 'approve' ? 'kyc.approve' : 'kyc.reject',
      resourceType: 'business',
      resourceId: businessId,
      before: { kyc: before.kyc },
      after: { kyc: { status: newStatus, reviewedAt: now, reviewedBy: access.auth.user.uid, rejectionReason: decision === 'reject' ? rejectionReason : null } },
      outcome: 'success',
    });

    return ok({ status: newStatus });
  } catch (error) {
    trackApiError('/api/admin/kyc/[businessId]', error);
    return Errors.serverError();
  }
}
