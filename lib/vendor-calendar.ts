import type { VendorBooking } from '@/lib/vendor-data';

function qatarDateId(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function qatarWeekDays(now = new Date()) {
  const [year, month, day] = qatarDateId(now).split('-').map(Number);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));
    return {
      id: date.toISOString().slice(0, 10),
      weekday: date.toLocaleDateString('en-QA', { weekday: 'short', timeZone: 'UTC' }),
      day: date.toLocaleDateString('en-QA', { day: 'numeric', timeZone: 'UTC' }),
      label: index === 0 ? 'Today' : date.toLocaleDateString('en-QA', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    };
  });
}

export function vendorBookingDayId(booking: Pick<VendorBooking, 'bookingDate'>): string | null {
  if (!booking.bookingDate) return null;
  const date = new Date(booking.bookingDate);
  return Number.isNaN(date.getTime()) ? null : qatarDateId(date);
}
