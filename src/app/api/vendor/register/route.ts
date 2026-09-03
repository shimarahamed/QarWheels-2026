import { type NextRequest } from 'next/server';
import { BusinessCreateSchema, BranchCreateSchema } from '@/lib/schemas';
import { z } from 'zod';
import { ok, Errors } from '@/lib/api-response';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { syncClaimsForUser } from '@/lib/auth/claims';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import type { Business, Branch, Membership } from '@/lib/types';

const RegisterVendorSchema = z.object({
  business: BusinessCreateSchema,
  branch: BranchCreateSchema,
});

// Vendor self-signup: creates the business, its first branch, and the
// owner's membership together, then mints the owner's `qw` custom claim so
// they land in a claims-aware vendor dashboard on next token refresh. This
// replaces the old client-side setDoc(vendors/{uid}) — businessId/branchId
// are now always auto-generated, never the caller's Auth UID.
export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  const rateLimitKey = await getRateLimitKey('vendor:register', user.uid);
  if (await isRateLimited(rateLimitKey, API_LIMITS.vendorRegister)) {
    trackRateLimit('vendor:register', rateLimitKey);
    return Errors.rateLimited();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }

  const parsed = RegisterVendorSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }
  const { business: businessInput, branch: branchInput } = parsed.data;

  try {
    const db = getAdminFirestore();

    // Reject if this user already owns/works at a business.
    const existing = await db
      .collection('memberships')
      .where('userId', '==', user.uid)
      .where('status', '==', 'Active')
      .limit(1)
      .get();
    if (!existing.empty) {
      return Errors.badRequest('This account already belongs to a business');
    }

    const now = new Date().toISOString();
    const businessRef = db.collection('businesses').doc();
    const branchRef = db.collection('branches').doc();
    const membershipRef = db.collection('memberships').doc(`${user.uid}_${businessRef.id}`);

    const business: Business = {
      legalName: businessInput.legalName,
      displayName: businessInput.displayName,
      ownerId: user.uid,
      type: businessInput.type,
      status: 'Active',
      contactEmail: businessInput.contactEmail,
      contactPhone: businessInput.contactPhone,
      ...(businessInput.websiteUrl ? { websiteUrl: businessInput.websiteUrl } : {}),
      kyc: { status: 'Pending' },
      commissionRateBps: 1000,
      branchCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const branch: Branch = {
      businessId: businessRef.id,
      name: branchInput.name,
      status: 'Pending Approval',
      isListed: false,
      address: branchInput.address,
      city: branchInput.city,
      country: branchInput.country,
      latitude: branchInput.latitude,
      longitude: branchInput.longitude,
      phoneNumber: branchInput.phoneNumber,
      vacationMode: false,
      createdAt: now,
      updatedAt: now,
    };

    const membership: Membership = {
      userId: user.uid,
      businessId: businessRef.id,
      role: 'business_owner',
      branchIds: [],
      status: 'Active',
      email: businessInput.contactEmail,
      displayName: businessInput.displayName,
      invitedBy: user.uid,
      invitedAt: now,
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.runTransaction(async (tx) => {
      tx.set(businessRef, business);
      tx.set(branchRef, branch);
      tx.set(membershipRef, membership);
    });

    const claims = await syncClaimsForUser(user.uid);

    return ok({
      businessId: businessRef.id,
      branchId: branchRef.id,
      claims,
    });
  } catch (error) {
    trackApiError('/api/vendor/register', error);
    return Errors.serverError();
  }
}
