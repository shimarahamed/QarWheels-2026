/**
 * Money formatting for the mobile app.
 *
 * Mirrors src/lib/money.ts on the web side. Mobile has no build-time link to
 * src/, so this is kept in sync by hand — the same arrangement the codebase
 * already uses for booking-workflow.ts and roles.ts.
 *
 * Every amount in the payouts/invoices domain is an integer number of MINOR
 * UNITS (fils; 1 QAR = 100 fils). The division by 100 happens exactly once,
 * here, at display time — never in arithmetic that feeds another amount.
 */

/** Formats minor units for display, e.g. 123456 -> "QAR 1,234.56". */
export function formatMinorUnits(minorUnits: number, currency = 'QAR'): string {
  return `${currency} ${formatMinorUnitsAmount(minorUnits)}`;
}

/** The bare number, e.g. 123456 -> "1,234.56". */
export function formatMinorUnitsAmount(minorUnits: number): string {
  const negative = minorUnits < 0;
  const abs = Math.abs(Math.round(minorUnits));
  const major = Math.floor(abs / 100);
  const fils = abs % 100;
  const grouped = major.toLocaleString('en-US');
  return `${negative ? '-' : ''}${grouped}.${String(fils).padStart(2, '0')}`;
}

/**
 * Parses a user-typed major-unit amount ("12.34") into integer minor units.
 * Returns null when the input isn't usable, so callers can show a validation
 * message rather than writing a NaN into a total.
 */
export function parseMajorUnitsToMinor(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  // Round rather than truncate, and guard the float multiply — 19.99 * 100
  // is 1998.9999... in IEEE 754.
  return Math.round(value * 100);
}

/** The platform's minimum payout, mirrored from the payouts/request route. */
export const MINIMUM_PAYOUT_MINOR_UNITS = 10_000;
