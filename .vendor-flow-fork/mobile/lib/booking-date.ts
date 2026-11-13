/** Booking appointments are shown in the service market's time zone, not the device's. */
export function formatBookingDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'Date unavailable';
  // Retain legacy human-readable labels, but never render raw invalid ISO values.
  if (!/^\d{4}-/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Qatar',
  }) + ' (Qatar)';
}
