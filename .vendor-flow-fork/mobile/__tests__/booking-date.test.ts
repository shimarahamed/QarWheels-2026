import { formatBookingDate } from '@/lib/booking-date';

it('formats UTC appointments in Qatar time including the date rollover', () => {
  expect(formatBookingDate('2026-11-02T22:00:00.000Z')).toBe('3 Nov 2026, 01:00 am (Qatar)');
});
it.each([undefined, null, '', {}, '2026-11-xx'])('handles missing or invalid dates: %j', (value) => {
  expect(formatBookingDate(value)).toBe('Date unavailable');
});
it('retains a legacy readable booking label', () => {
  expect(formatBookingDate('Tomorrow at 10:00')).toBe('Tomorrow at 10:00');
});
