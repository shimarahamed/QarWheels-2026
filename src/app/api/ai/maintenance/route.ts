import { type NextRequest } from 'next/server';
import { MaintenanceRequestSchema } from '@/lib/schemas';
import { ok, Errors } from '@/lib/api-response';
import { isRateLimited, AI_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import { predictMaintenance } from '@/ai/flows/predictive-maintenance-suggestions';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';

export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  const rateLimitKey = await getRateLimitKey('ai:maintenance', user.uid);
  if (await isRateLimited(rateLimitKey, AI_LIMITS.maintenance)) {
    trackRateLimit('ai:maintenance', rateLimitKey);
    return Errors.rateLimited();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Request body must be valid JSON');
  }

  const parsed = MaintenanceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.badRequest('Invalid request', parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await predictMaintenance(parsed.data);
    return ok(result);
  } catch (error) {
    trackApiError('/api/ai/maintenance', error);
    return Errors.aiUnavailable();
  }
}
