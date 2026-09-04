import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireAction } from '@/lib/auth/require-role';
import { syncClaimsForUser } from '@/lib/auth/claims';
import { trackApiError } from '@/lib/observability';
import { AssignableMembershipRoleSchema } from '@/lib/schemas';
import type { Membership, Branch } from '@/lib/types';

const PatchSchema = z.object({
  // business_owner is absent by construction — see AssignableMembershipRoleSchema.
  role: AssignableMembershipRoleSchema.optional(),
  branchIds: z.array(z.string().min(1)).min(1).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

async function loadMembership(membershipId: string) {
  const db = getAdminFirestore();
  const ref = db.collection('memberships').doc(membershipId);
  const snap = await ref.get();
  return { db, ref, snap, membership: snap.exists ? (snap.data() as Membership) : null };
}

// PATCH edits a staff member's role/branches/status; DELETE revokes them
// entirely. Both are owner/admin-only, scoped to their own business, and
// re-sync the target's qw claim so a revoke takes effect on their next
// token refresh (see claimsRefreshedAt / refreshClaims() client-side).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const { membershipId } = await params;
  const access = await requireAction(request, 'staff.manage');
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }

  try {
    const { db, ref, membership } = await loadMembership(membershipId);
    if (!membership) return Errors.notFound('Staff member');

    const { auth } = access;
    const callerBusinessId = auth.role === 'master_admin' ? membership.businessId : (auth.claims && auth.claims.r !== 'master_admin' ? auth.claims.b : null);
    if (callerBusinessId !== membership.businessId) return Errors.forbidden();
    if (membership.role === 'business_owner') {
      return Errors.badRequest('Cannot change the business owner via this route');
    }

    if (parsed.data.branchIds) {
      const branchDocs = await db.getAll(...parsed.data.branchIds.map((id) => db.collection('branches').doc(id)));
      for (const snap of branchDocs) {
        if (!snap.exists || (snap.data() as Branch).businessId !== membership.businessId) {
          return Errors.badRequest(`Branch ${snap.id} does not belong to this business`);
        }
      }
    }

    await ref.update({ ...parsed.data, updatedAt: new Date().toISOString() });
    const claims = await syncClaimsForUser(membership.userId);

    return ok({ membershipId, claims });
  } catch (error) {
    trackApiError('/api/vendor/staff/[membershipId] PATCH', error);
    return Errors.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const { membershipId } = await params;
  const access = await requireAction(request, 'staff.manage');
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  try {
    const { ref, membership } = await loadMembership(membershipId);
    if (!membership) return Errors.notFound('Staff member');

    const { auth } = access;
    const callerBusinessId = auth.role === 'master_admin' ? membership.businessId : (auth.claims && auth.claims.r !== 'master_admin' ? auth.claims.b : null);
    if (callerBusinessId !== membership.businessId) return Errors.forbidden();
    if (membership.role === 'business_owner') {
      return Errors.badRequest('Cannot revoke the business owner');
    }

    await ref.delete();
    // Wipes the claim entirely rather than leaving a stale businessId around.
    await syncClaimsForUser(membership.userId);

    return ok({ revoked: true });
  } catch (error) {
    trackApiError('/api/vendor/staff/[membershipId] DELETE', error);
    return Errors.serverError();
  }
}
