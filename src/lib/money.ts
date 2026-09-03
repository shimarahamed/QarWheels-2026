/**
 * Money formatting for the web app.
 *
 * Every monetary amount in the payouts/invoices domain is stored as an integer
 * number of MINOR UNITS (fils; 1 QAR = 100 fils). Integers are the storage
 * format precisely so that summing, commissioning, and splitting amounts never
 * accumulates float error. The division by 100 therefore happens exactly once,
 * here, at the moment of display — never in arithmetic that feeds back into
 * another amount.
 */

/** Formats minor units for display, e.g. 123456 -> "QAR 1,234.56". */
export function formatMinorUnits(minorUnits: number, currency = 'QAR'): string {
  return `${currency} ${formatMinorUnitsAmount(minorUnits)}`;
}

/** The bare number, e.g. 123456 -> "1,234.56" — for columns with their own currency header. */
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
 * Returns null when the input isn't a usable amount, so callers can show a
 * validation message rather than silently writing a NaN into a total.
 */
export function parseMajorUnitsToMinor(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  // Round rather than truncate so "0.015" doesn't quietly become 1 fils, and
  // guard the float multiply with a round — 19.99 * 100 is 1998.9999... .
  return Math.round(value * 100);
}

/** The platform's minimum payout, mirrored from the payouts/request route. */
export const MINIMUM_PAYOUT_MINOR_UNITS = 10_000;
