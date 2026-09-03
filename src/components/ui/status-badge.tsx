import type { BookingStatus } from '@/lib/types';

/**
 * Booking-status chip driven by the shared design tokens, so a status looks
 * the same on web as it does in the mobile app. The colours come from
 * --qw-status-* custom properties emitted by scripts/build-tokens.mjs, which
 * means the light/dark variants switch with the theme automatically and
 * neither platform can drift from the other.
 *
 * Previously each page hand-mapped statuses onto shadcn Badge variants,
 * which collapsed nine distinct statuses onto four visual treatments —
 * Declined and Cancelled looked identical, as did Confirmed and InProgress.
 */

const HUMAN_LABEL: Record<BookingStatus, string> = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  VehicleReceived: 'Vehicle received',
  InProgress: 'In progress',
  ReadyForPickup: 'Ready for pickup',
  Completed: 'Completed',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
};

export function StatusBadge({ status, className = '' }: { status: BookingStatus; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}
      style={{
        backgroundColor: `var(--qw-status-${key}-bg)`,
        color: `var(--qw-status-${key}-text)`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--qw-status-${key}-dot)` }}
      />
      {HUMAN_LABEL[status] ?? status}
    </span>
  );
}
