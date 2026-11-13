import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { bookingScheduleDate, bookingsOnScheduleDay, scheduleDays } from '@/lib/vendor-schedule';
import type { Booking, WithId } from '@/lib/types';

const booking = (id: string, bookingDate: Booking['bookingDate']) => ({ id, bookingDate } as WithId<Booking>);

describe('vendor booking schedule', () => {
  it('accepts supported date representations and rejects malformed dates', () => {
    const date = new Date(2026, 10, 12, 10);
    expect(bookingScheduleDate(date)?.getTime()).toBe(date.getTime());
    expect(bookingScheduleDate(Timestamp.fromDate(date))?.getTime()).toBe(date.getTime());
    expect(bookingScheduleDate(date.toISOString())?.getTime()).toBe(date.getTime());
    expect(bookingScheduleDate('missing')).toBeNull();
  });

  it('builds a day or seven consecutive local calendar days across month boundaries', () => {
    expect(scheduleDays('2026-11-30', 1)).toHaveLength(1);
    const days = scheduleDays('2026-11-30', 7);
    expect(days).toHaveLength(7);
    expect(days[1].getMonth()).toBe(11);
    expect(days[6].getDate()).toBe(6);
    expect(scheduleDays('', 7)).toEqual([]);
  });

  it('sorts preferred times and includes midnight only in its own day', () => {
    const jobs = [booking('late', new Date(2026, 10, 12, 19)), booking('invalid', 'invalid'), booking('next', new Date(2026, 10, 13)), booking('early', new Date(2026, 10, 12)), booking('previous', new Date(2026, 10, 11, 23, 59))];
    expect(bookingsOnScheduleDay(jobs, new Date(2026, 10, 12)).map(({ id }) => id)).toEqual(['early', 'late']);
    expect(jobs[0].id).toBe('late');
  });
});
