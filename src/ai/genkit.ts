import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-1.5-flash',
});

/**
 * Strips control characters and enforces length limits on user-supplied text
 * before it is interpolated into any AI prompt. Prevents prompt injection.
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .replace(/<\/?[^>]+(>|$)/g, '')                       // strip HTML/XML tags
    .slice(0, maxLength)
    .trim();
}

/**
 * Wraps an AI flow call with up to `attempts` retries using exponential backoff.
 * Only retries on transient errors (rate-limits, server errors, timeouts).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await Promise.race<T>([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 30_000)
        ),
      ]);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('AI_TIMEOUT');
      if (!isTransient || i === attempts - 1) throw error;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastError;
}
