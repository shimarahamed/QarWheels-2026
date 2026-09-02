import { type NextRequest } from 'next/server';
import { StaffInviteCreateSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { requireRole } from '@/lib/auth/require-role';
import { generateInviteToken, hashInviteToken } from '@/lib/auth/invite-token';
import { sendEmail } from '@/lib/email';
import { trackApiError } from '@/lib/observability';
import type { StaffInvite, Branch } from '@/lib/types';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Owner/admin invites a staff member by email. Creates a staff_invites doc
// (Admin-SDK-only per firestore.rules — no client can ever write one
// directly) and emails a join link. The raw token only ever exists in the
// link and the response body; only its SHA-256 hash is persisted.
export async function POST(request: NextRequest) {
  const access = await requireRole(request, ['business_owner', 'business_admin']);
  if (!access.ok) {
    return access.reason === 'unauthenticated' ? Errors.unauthorized() : Errors.forbidden();
  }
  const { auth } = access;
  if (auth.role === 'master_admin' || !auth.claims || auth.claims.r === 'master_admin') {
    return Errors.forbidden();
  }
  const businessId = auth.claims.b;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = StaffInviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { email, role, jobTitle, branchIds } = parsed.data;

  if (role === 'business_owner') {
    return Errors.badRequest('Cannot invite a second business_owner — use business_admin instead');
  }

  try {
    const db = getAdminFirestore();

    // Validate every branchId actually belongs to this business, so an
    // owner can't (even accidentally) scope an invite to another tenant's branch.
    const branchDocs = await db.getAll(...branchIds.map((id) => db.collection('branches').doc(id)));
    for (const snap of branchDocs) {
      if (!snap.exists || (snap.data() as Branch).businessId !== businessId) {
        return Errors.badRequest(`Branch ${snap.id} does not belong to this business`);
      }
    }

    const token = generateInviteToken();
    const tokenHash = await hashInviteToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();

    const invite: StaffInvite = {
      businessId,
      branchIds,
      email,
      role,
      ...(jobTitle ? { jobTitle } : {}),
      tokenHash,
      status: 'Pending',
      expiresAt,
      createdBy: auth.user.uid,
      createdAt: now.toISOString(),
    };
    const inviteRef = await db.collection('staff_invites').add(invite);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002';
    const joinUrl = `${appUrl}/vendor/join?invite=${inviteRef.id}&token=${token}`;

    await sendEmail({
      to: email,
      subject: "You're invited to join a QarWheel garage team",
      html: `<p>You've been invited to join as ${jobTitle ?? role.replace('_', ' ')}.</p><p><a href="${joinUrl}">Accept invite</a></p><p>This link expires in 7 days.</p>`,
      text: `You've been invited to join a QarWheel garage team. Accept: ${joinUrl} (expires in 7 days)`,
    });

    return ok({ inviteId: inviteRef.id, joinUrl, expiresAt });
  } catch (error) {
    trackApiError('/api/vendor/staff/invite', error);
    return Errors.serverError();
  }
}
