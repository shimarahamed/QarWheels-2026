import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('production rate limit', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('ALLOW_INSECURE_RATE_LIMIT', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.test');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects a URL without its token instead of falling back to process memory', async () => {
    vi.stubEnv('ALLOW_INSECURE_RATE_LIMIT', '1');
    const { isRateLimited } = await import('@/lib/rate-limit');
    await expect(isRateLimited('booking:test', { max: 2, windowSecs: 60 })).rejects.toThrow('required in production');
  });

  it('increments and expires the counter in one Redis script', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 3 }) });
    vi.stubGlobal('fetch', fetchMock);
    const { isRateLimited } = await import('@/lib/rate-limit');
    expect(await isRateLimited('booking:test', { max: 2, windowSecs: 60 })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://redis.example.test');
    const [command, script, count, key, seconds] = JSON.parse(options.body);
    expect([command, count, key, seconds]).toEqual(['EVAL', 1, 'booking:test', 60]);
    expect(script).toContain("redis.call('INCR'");
    expect(script).toContain("redis.call('EXPIRE'");
  });

  it('denies requests when Redis fails in production', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { isRateLimited } = await import('@/lib/rate-limit');
    expect(await isRateLimited('booking:test', { max: 2, windowSecs: 60 })).toBe(true);
    vi.restoreAllMocks();
  });
});
