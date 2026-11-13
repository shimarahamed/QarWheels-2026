import { qatarWeekDays, vendorBookingDayId } from '@/lib/vendor-calendar';

it('builds the next seven dates from the Qatar day, including a month boundary', () => {
  const days = qatarWeekDays(new Date('2026-10-31T22:30:00.000Z'));
  expect(days).toHaveLength(7);
  expect(days[0].id).toBe('2026-11-01');
  expect(days[0].label).toBe('Today');
  expect(days[1].id).toBe('2026-11-02');
});

it('places a request on its Qatar date and ignores missing or invalid dates', () => {
  expect(vendorBookingDayId({ bookingDate: '2026-11-05T22:30:00.000Z' })).toBe('2026-11-06');
  expect(vendorBookingDayId({ bookingDate: undefined })).toBeNull();
  expect(vendorBookingDayId({ bookingDate: 'invalid' })).toBeNull();
});
