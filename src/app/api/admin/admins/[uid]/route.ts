import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { syncClaimsForUser } from '@/lib/auth/claims';
import { writeAuditLog } from '@/lib/audit';
import { trackApiError } from '@/lib/observability';
import type { AdminRecord } from '@/lib/types';

const PatchSchema = z.object({
  level: z.enum(['super', 'ops', 'support']),
});

async function requireSuperAdmin(request: NextRequest) {
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) return access;
  if (!access.auth.claims || access.auth.claims.r !== 'master_admin' || access.auth.claims.lvl !== 'super') {
    return { ok: false as const, reason: 'forbidden' as const };
  }
  return access;
}

async function countSuperAdmins(db: FirebaseFirestore.Firestore, excludingUid?: string): Promise<number> {
  const snap = await db.collection('roles_admin').where('level', '==', 'super').get();
  return snap.docs.filter((d) => d.id !== excludingUid).length;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const access = await requireSuperAdmin(request);
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
    const db = getAdminFirestore();
    const ref = db.collection('roles_admin').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return Errors.notFound('Admin');
    const before = snap.data() as AdminRecord;

    // A super-admin cannot demote themselves if they're the last one — the
    // instance would have zero super-admins left, locking everyone out of
    // admin provisioning permanently.
    if (before.level === 'super' && parsed.data.level !== 'super') {
      const remaining = await countSuperAdmins(db, uid);
      if (remaining === 0) {
        return Errors.badRequest('Cannot demote the last super-admin');
      }
    }

    await ref.update({ level: parsed.data.level });
    const claims = await syncClaimsForUser(uid);

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      action: 'admin.update',
      resourceType: 'admin',
      resourceId: uid,
      before: { level: before.level },
      after: { level: parsed.data.level },
      outcome: 'success',
    });

    return ok({ uid, claims });
  } catch (error) {
    trackApiError('/api/admin/admins/[uid] PATCH', error);
    return Errors.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const access = await requireSuperAdmin(request);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  if (uid === access.auth.user.uid) {
    return Errors.badRequest('Cannot remove your own admin access');
  }

  try {
    const db = getAdminFirestore();
    const ref = db.collection('roles_admin').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return Errors.notFound('Admin');
    const before = snap.data() as AdminRecord;

    if (before.level === 'super') {
      const remaining = await countSuperAdmins(db, uid);
      if (remaining === 0) {
        return Errors.badRequest('Cannot remove the last super-admin');
      }
    }

    await ref.delete();
    await syncClaimsForUser(uid);

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      action: 'admin.revoke',
      resourceType: 'admin',
      resourceId: uid,
      before: { level: before.level, email: before.email },
      outcome: 'success',
    });

    return ok({ revoked: true });
  } catch (error) {
    trackApiError('/api/admin/admins/[uid] DELETE', error);
    return Errors.serverError();
  }
}
