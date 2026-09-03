import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { syncClaimsForUser } from '@/lib/auth/claims';
import { writeAuditLog } from '@/lib/audit';
import { trackApiError } from '@/lib/observability';
import type { AdminRecord, WithId } from '@/lib/types';

// roles_admin keeps `allow write: if false` in firestore.rules — no client
// can ever grant itself (or anyone) admin. This route is the one controlled
// server-side path: only an existing `super` admin may invite another
// admin, so the very first super-admin has to be created out-of-band via
// scripts/bootstrap-admin.mjs (a service-account script, not reachable from
// any client at all).

const InviteAdminSchema = z.object({
  email: z.string().email(),
  level: z.enum(['super', 'ops', 'support']),
});

export async function GET(request: NextRequest) {
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('roles_admin').get();
    const admins: WithId<AdminRecord>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminRecord) }));
    return ok({ admins });
  } catch (error) {
    trackApiError('/api/admin/admins GET', error);
    return Errors.serverError();
  }
}

export async function POST(request: NextRequest) {
  const access = await requireRole(request, ['master_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  if (!access.auth.claims || access.auth.claims.r !== 'master_admin' || access.auth.claims.lvl !== 'super') {
    return Errors.forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = InviteAdminSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { email, level } = parsed.data;

  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    let targetUser;
    try {
      targetUser = await auth.getUserByEmail(email);
    } catch {
      return Errors.badRequest('No account exists for this email yet — ask them to sign up first, then invite them.');
    }

    const now = new Date().toISOString();
    const record: AdminRecord = {
      uid: targetUser.uid,
      email,
      displayName: targetUser.displayName ?? email,
      level,
      createdBy: access.auth.user.uid,
      createdAt: now,
    };
    await db.collection('roles_admin').doc(targetUser.uid).set(record);
    const claims = await syncClaimsForUser(targetUser.uid);

    await writeAuditLog({
      actorId: access.auth.user.uid,
      actorRole: 'master_admin',
      actorEmail: access.auth.user.email,
      action: 'admin.invite',
      resourceType: 'admin',
      resourceId: targetUser.uid,
      after: { email, level },
      outcome: 'success',
    });

    return ok({ uid: targetUser.uid, claims });
  } catch (error) {
    trackApiError('/api/admin/admins POST', error);
    return Errors.serverError();
  }
}
