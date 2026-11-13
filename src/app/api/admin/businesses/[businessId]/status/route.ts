import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAdminMutation } from '@/lib/auth/require-role';
import { writeAuditLog } from '@/lib/audit';
import { trackApiError } from '@/lib/observability';

const StatusSchema = z.object({ status: z.enum(['Active', 'Suspended']) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const access = await requireAdminMutation(request);
  if (!access.ok) return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  const parsed = StatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Errors.badRequest('Invalid business status');

  const { businessId } = await params;
  const { status } = parsed.data;
  const now = new Date().toISOString();
  try {
    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const result = await db.runTransaction(async (tx) => {
      const business = await tx.get(businessRef);
      if (!business.exists) return { kind: 'missing' as const };
      const before = business.get('status') as string;
      if (status === 'Active' && before === 'Active') return { kind: 'unchanged' as const };

      // shortcut: one atomic suspension supports up to 499 listed branches; use a staged job for larger tenants.
      const listed = status === 'Suspended'
        ? await tx.get(db.collection('branches').where('businessId', '==', businessId).where('isListed', '==', true).limit(500))
        : null;
      if (listed && listed.size >= 500) return { kind: 'tooMany' as const };

      tx.update(businessRef, { status, updatedAt: now });
      for (const branch of listed?.docs ?? []) tx.update(branch.ref, { isListed: false, updatedAt: now });
      return { kind: 'updated' as const, before, delistedBranches: listed?.size ?? 0 };
    });
    if (result.kind === 'missing') return Errors.notFound('Business');
    if (result.kind === 'tooMany') return err('Too many listed branches for an atomic suspension.', 409);
    if (result.kind === 'unchanged') return ok({ status, delistedBranches: 0 });

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      businessId,
      action: 'business.update',
      resourceType: 'business',
      resourceId: businessId,
      before: { status: result.before },
      after: { status, delistedBranches: result.delistedBranches },
      outcome: 'success',
    });
    return ok({ status, delistedBranches: result.delistedBranches });
  } catch (error) {
    trackApiError('/api/admin/businesses/[businessId]/status', error);
    return Errors.serverError();
  }
}
