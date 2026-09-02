import { type NextRequest } from 'next/server';
import { VinRequestSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { isRateLimited, AI_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import { getVinDetails } from '@/ai/flows/get-vin-details';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';

export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  const rateLimitKey = await getRateLimitKey('ai:vin', user.uid);
  if (await isRateLimited(rateLimitKey, AI_LIMITS.vin)) {
    trackRateLimit('ai:vin', rateLimitKey);
    return Errors.rateLimited();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }

  const parsed = VinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid VIN', parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await getVinDetails(parsed.data);
    return ok(result);
  } catch (error) {
    trackApiError('/api/ai/vin', error);
    return Errors.aiUnavailable();
  }
}
