/**
 * Sliding-window rate limiter.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise falls back to an in-process store that resets on restart.
 *
 * To enable Redis: create a free Upstash database at https://console.upstash.com,
 * then add to .env.local:
 *   UPSTASH_REDIS_REST_URL=https://...upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-memory limiter. Limits will reset on server restart and will not work across multiple instances.');
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of store.entries()) {
      if (w.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  max: number;
  /** Window duration in seconds */
  windowSecs: number;
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getRateLimitKey(scope: string, token?: string | null, fallback = 'anonymous') {
  const raw = token || fallback;
  const hash = await sha256(raw);
  return `${scope}:${hash.slice(0, 32)}`;
}

/**
 * Returns true when the key is rate-limited (limit exceeded).
 * Returns false when the request should be allowed through.
 */
function isRateLimitedInMemory(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const resetAt = now + options.windowSecs * 1000;

  const existing = store.get(key);
  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt });
    return false;
  }

  if (existing.count >= options.max) return true;

  existing.count += 1;
  return false;
}

async function isRateLimitedWithUpstash(key: string, options: RateLimitOptions) {
  const config = getUpstashConfig();
  if (!config) return null;

  const encodedKey = encodeURIComponent(key);
  const headers = { Authorization: `Bearer ${config.token}` };
  const incrementResponse = await fetch(`${config.url}/incr/${encodedKey}`, { headers });

  if (!incrementResponse.ok) {
    throw new Error('Upstash rate-limit increment failed');
  }

  const incrementBody = (await incrementResponse.json()) as { result?: number };
  const count = incrementBody.result ?? 0;

  if (count === 1) {
    await fetch(`${config.url}/expire/${encodedKey}/${options.windowSecs}`, { headers });
  }

  return count > options.max;
}

export async function isRateLimited(key: string, options: RateLimitOptions): Promise<boolean> {
  try {
    const redisResult = await isRateLimitedWithUpstash(key, options);
    if (redisResult !== null) return redisResult;
  } catch (error) {
    console.error('[rate-limit] Falling back to in-memory limiter:', error);
  }

  return isRateLimitedInMemory(key, options);
}

// Preset limits for AI endpoints
export const AI_LIMITS = {
  diagnose: { max: 10, windowSecs: 3600 },      // 10/user/hour
  maintenance: { max: 10, windowSecs: 86400 },   // 10/user/day
  vin: { max: 5, windowSecs: 86400 },            // 5/user/day
  summarize: { max: 5, windowSecs: 86400 },      // 5/user/day
  insights: { max: 20, windowSecs: 86400 },      // 20/vendor/day
} as const;
