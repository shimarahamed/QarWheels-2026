import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
  model: googleAI.model(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash', { maxOutputTokens: 1500 }),
});

/**
 * Strips control characters and enforces length limits on user-supplied text
 * before it is interpolated into any AI prompt. This is not a prompt-injection defense.
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
 * Only retries on transient provider errors. The prior call must settle before
 * another starts; a Promise.race timeout would leave model work running.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      return await fn(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('AI_TIMEOUT', { cause: error });
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      const isTransient =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('500');
      if (!isTransient || i === attempts - 1) throw error;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
