import { z } from 'zod';

// ─── Shared input validation ─────────────────────────────────────────────────
// One place for the rules, so a field validates the same way wherever it
// appears. Messages are written for the person typing, not the developer:
// they say what to do, not what failed.

/** Qatari mobile numbers are 8 digits starting 3, 5, 6 or 7, optionally +974. */
export const qatarPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine(
    (value) => /^(\+974)?[3567]\d{7}$/.test(value),
    'Enter a Qatar mobile number, for example +974 3312 3456.',
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  // Deliberately permissive: the only authority on a deliverable address is
  // the verification email. This catches typos, not exotic-but-valid addresses.
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Check the email address and try again.');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/\d/, 'Include at least one number.');

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(50, 'That name is too long.');

export const addressSchema = z.object({
  label: z.string().trim().max(30, 'Keep the label short.').optional(),
  line: z.string().trim().min(3, 'Enter the street or building.'),
  area: z.string().trim().min(2, 'Enter the area.'),
  instructions: z.string().trim().max(200, 'Keep notes under 200 characters.').optional(),
});

export const topUpAmountSchema = z
  .number()
  .positive('Enter an amount greater than zero.')
  .max(10_000, 'The maximum top-up is QAR 10,000.');

/**
 * Run a schema and return the first message, or null when valid.
 * Screens use Alerts rather than inline field errors, so a single string is
 * the useful shape.
 */
export function firstError(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Please check this field.';
}

/** True when the value satisfies the schema. */
export function isValid(schema: z.ZodType, value: unknown): boolean {
  return schema.safeParse(value).success;
}
