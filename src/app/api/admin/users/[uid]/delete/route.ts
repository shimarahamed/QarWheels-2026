import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { requireRole } from '@/lib/auth/require-role';
import { deleteAccount } from '@/lib/account-deletion';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { isRateLimited, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';

const DeleteUserSchema = z.object({
  // A business_owner is blocked from self-deleting (deleteAccount's
  // owns_business check) — only a super admin may override that, and only
  // by setting this explicitly, since force-deleting a business owner
  // orphans that business's staff without a documented succession plan.
  force: z.boolean().optional().default(false),
});

// Admin-initiated account deletion — replaces the previous
// safeDeleteDoc(doc(firestore, 'users', id)) path in
// src/app/admin/dashboard/users/page.tsx, which only removed the Firestore
// profile doc and left the Firebase Auth account intact (able to sign in
// with no profile — an orphaned account, not a deleted one). This route
// runs the same soft-delete + anonymize pipeline the self-service route
// uses (see src/lib/account-deletion.ts), so admin-deleted and
// self-deleted accounts leave identical, correct data behind.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — force defaults to false.
  }
  const parsed = DeleteUserSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { force } = parsed.data;

  if (force && (!auth.claims || auth.claims.r !== 'master_admin' || auth.claims.lvl !== 'super')) {
    return Errors.forbidden();
  }

  const rateLimitKey = await getRateLimitKey('admin:user-delete', auth.user.uid);
  if (await isRateLimited(rateLimitKey, { max: 30, windowSecs: 3600 })) {
    trackRateLimit('admin:user-delete', rateLimitKey);
    return Errors.rateLimited();
  }

  try {
    const result = await deleteAccount(uid, {
      id: auth.user.uid,
      role: 'master_admin',
      email: auth.user.email ?? undefined,
    });

    if (!result.ok) {
      if (!force) {
        return Errors.badRequest(
          'This account owns a business and cannot be deleted without transferring ownership first. ' +
          'A super admin can override this with force:true, which leaves the business without a clear successor — use with care.',
        );
      }

      // Forced path: reassign ownership isn't attempted automatically (no
      // safe default successor exists) — the business is left intact but
      // ownerless, which a super admin must resolve manually afterward.
      // The membership is revoked here (same as the non-owner path) so at
      // least the deleted person's own access is actually gone, even
      // though this leaves a real gap that shows up in the audit trail.
      const db = getAdminFirestore();
      const ownerMemberships = await db.collection('memberships')
        .where('userId', '==', uid)
        .where('role', '==', 'business_owner')
        .where('status', '==', 'Active')
        .get();
      const batch = db.batch();
      for (const d of ownerMemberships.docs) {
        batch.update(d.ref, { status: 'Inactive', updatedAt: new Date().toISOString() });
      }
      await batch.commit();

      const retryResult = await deleteAccount(uid, {
        id: auth.user.uid,
        role: 'master_admin',
        email: auth.user.email ?? undefined,
      });
      if (!retryResult.ok) return Errors.serverError();
      return ok({ deleted: true, forced: true, summary: retryResult.summary });
    }

    return ok({ deleted: true, summary: result.summary });
  } catch (error) {
    trackApiError('/api/admin/users/[uid]/delete', error);
    return Errors.serverError();
  }
}
