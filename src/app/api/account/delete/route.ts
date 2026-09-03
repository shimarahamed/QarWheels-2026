import { type NextRequest } from 'next/server';
import { ok, Errors } from '@/lib/api-response';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { deleteAccount } from '@/lib/account-deletion';
import { isRateLimited, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';

// Account deletion, shared by web and mobile — GDPR Art. 17 (right to
// erasure) and app-store account-deletion requirements (Apple 5.1.1(v),
// Play Data Safety). Approach is SOFT-DELETE + ANONYMIZE, not hard-delete —
// see src/lib/account-deletion.ts for the full implementation and rationale:
//
//  - The Firebase Auth account is genuinely, permanently deleted — the
//    person can no longer sign in, and their credentials/tokens are gone.
//  - Personal profile fields (name, email, phone, favorites, push tokens)
//    are scrubbed, and every car + its service records are deleted outright
//    — those are unambiguously the customer's own data with no counter-party
//    who needs the record to survive.
//  - Bookings/invoices/transactions are RETAINED but customer-identifying
//    fields are anonymized ("Deleted User" / a stable placeholder email) —
//    a garage's own booking/financial history and the platform's commission
//    ledger must survive a customer deleting their account.
//
// A business_owner cannot delete their own account this way — see
// deleteAccount()'s owns_business check — they must transfer ownership or
// contact support first.
export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  // Deletion is destructive and irreversible — rate-limited generously
  // against abuse/mistakes (e.g. a buggy client retry loop) rather than
  // against a legitimate user, who only ever needs to call this once.
  const rateLimitKey = await getRateLimitKey('account:delete', user.uid);
  if (await isRateLimited(rateLimitKey, { max: 3, windowSecs: 3600 })) {
    trackRateLimit('account:delete', rateLimitKey);
    return Errors.rateLimited();
  }

  try {
    const result = await deleteAccount(user.uid, {
      id: user.uid,
      role: 'system', // self-initiated, not acting as any privileged role
      email: user.email ?? undefined,
    });

    if (!result.ok) {
      return Errors.badRequest(
        'This account owns a business. Transfer ownership to another admin, or contact support to close the business, before deleting your account.',
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    trackApiError('/api/account/delete', error);
    return Errors.serverError();
  }
}
