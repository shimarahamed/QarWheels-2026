import { type NextRequest } from 'next/server';
import { DiagnoseRequestSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { isRateLimited, AI_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import { diagnoseCarProblem } from '@/ai/flows/diagnose-car-problem';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';

export async function POST(request: NextRequest) {
  // 1. Require a verified Firebase ID token.
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  // 2. Rate limit: 10 diagnoses per user per hour
  const rateLimitKey = await getRateLimitKey('ai:diagnose', user.uid);
  if (await isRateLimited(rateLimitKey, AI_LIMITS.diagnose)) {
    trackRateLimit('ai:diagnose', rateLimitKey);
    return Errors.rateLimited();
  }

  // 3. Parse + validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }

  const parsed = DiagnoseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }

  // 4. Call AI flow
  try {
    const result = await diagnoseCarProblem({
      description: parsed.data.symptoms,
      carDetails: parsed.data.carDetails,
    });
    return ok(result);
  } catch (error) {
    trackApiError('/api/ai/diagnose', error);
    return Errors.aiUnavailable();
  }
}
