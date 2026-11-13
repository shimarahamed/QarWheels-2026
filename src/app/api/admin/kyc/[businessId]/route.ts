import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAdminMutation } from '@/lib/auth/require-role';
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
// of client updates). The decision and branch visibility commit together.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  const access = await requireAdminMutation(request);
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
    const now = new Date().toISOString();
    const newStatus = decision === 'approve' ? 'Verified' : 'Rejected';
    const result = await db.runTransaction(async (tx) => {
      const businessSnap = await tx.get(businessRef);
      if (!businessSnap.exists) return { kind: 'missing' as const };
      const before = businessSnap.data() as Business;
      const listApproved = decision === 'approve' && before.status === 'Active';
      const branchQuery = db.collection('branches')
        .where('businessId', '==', businessId)
        .where(listApproved ? 'status' : 'isListed', '==', listApproved ? 'Approved' : true)
        .limit(500);
      const branchesSnap = await tx.get(branchQuery);
      if (branchesSnap.docs.length >= 500) return { kind: 'tooMany' as const };

      tx.update(businessRef, {
        'kyc.status': newStatus,
        'kyc.reviewedAt': now,
        'kyc.reviewedBy': access.auth.user.uid,
        'kyc.rejectionReason': decision === 'reject' ? rejectionReason : null,
        updatedAt: now,
      });
      for (const doc of branchesSnap.docs) {
        tx.update(doc.ref, { isListed: listApproved, updatedAt: now });
      }
      return { kind: 'committed' as const, before };
    });
    if (result.kind === 'missing') return Errors.notFound('Business');
    if (result.kind === 'tooMany') return err('Too many branches for an atomic KYC review.', 409);

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      businessId,
      action: decision === 'approve' ? 'kyc.approve' : 'kyc.reject',
      resourceType: 'business',
      resourceId: businessId,
      before: { kyc: result.before.kyc },
      after: { kyc: { status: newStatus, reviewedAt: now, reviewedBy: access.auth.user.uid, rejectionReason: decision === 'reject' ? rejectionReason : null } },
      outcome: 'success',
    });

    return ok({ status: newStatus });
  } catch (error) {
    trackApiError('/api/admin/kyc/[businessId]', error);
    return Errors.serverError();
  }
}
