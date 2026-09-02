import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { hashInviteToken } from '@/lib/auth/invite-token';
import { syncClaimsForUser } from '@/lib/auth/claims';
import { trackApiError } from '@/lib/observability';
import type { StaffInvite, Membership } from '@/lib/types';

const AcceptSchema = z.object({
  inviteId: z.string().min(1),
  token: z.string().min(10),
});

// Invitee (already signed in — the /vendor/join page handles sign-up/sign-in
// first) redeems an invite link: validates the token, creates their
// membership, marks the invite Accepted, and syncs their qw claim so the
// next token refresh drops them straight into the branch-scoped dashboard.
export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }
  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { inviteId, token } = parsed.data;

  try {
    const db = getAdminFirestore();
    const inviteRef = db.collection('staff_invites').doc(inviteId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(inviteRef);
      if (!snap.exists) return { error: 'not_found' as const };
      const invite = snap.data() as StaffInvite;

      if (invite.status !== 'Pending') return { error: 'already_used' as const };
      if (new Date(invite.expiresAt as string).getTime() < Date.now()) return { error: 'expired' as const };

      const tokenHash = await hashInviteToken(token);
      if (tokenHash !== invite.tokenHash) return { error: 'invalid_token' as const };

      if (invite.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
        return { error: 'email_mismatch' as const };
      }

      const now = new Date().toISOString();
      const membershipId = `${user.uid}_${invite.businessId}`;
      const membershipRef = db.collection('memberships').doc(membershipId);

      const membership: Membership = {
        userId: user.uid,
        businessId: invite.businessId,
        role: invite.role,
        ...(invite.jobTitle ? { jobTitle: invite.jobTitle } : {}),
        branchIds: invite.branchIds,
        status: 'Active',
        email: invite.email,
        displayName: user.email ?? invite.email,
        invitedBy: invite.createdBy,
        invitedAt: invite.createdAt,
        acceptedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(membershipRef, membership);
      tx.update(inviteRef, { status: 'Accepted' });

      return { ok: true as const, businessId: invite.businessId };
    });

    if ('error' in result) {
      switch (result.error) {
        case 'not_found': return Errors.notFound('Invite');
        case 'already_used': return Errors.badRequest('This invite has already been used');
        case 'expired': return Errors.badRequest('This invite has expired');
        case 'invalid_token': return Errors.forbidden();
        case 'email_mismatch': return Errors.badRequest('This invite was sent to a different email address');
      }
    }

    const claims = await syncClaimsForUser(user.uid);
    return ok({ businessId: result.businessId, claims });
  } catch (error) {
    trackApiError('/api/vendor/staff/accept', error);
    return Errors.serverError();
  }
}
