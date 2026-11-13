import { addDays, isValid, parseISO, startOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Booking, WithId } from '@/lib/types';

export function bookingScheduleDate(value: Booking['bookingDate']): Date | null {
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  return isValid(date) ? date : null;
}

export function scheduleDays(dateKey: string, numberOfDays: 1 | 7): Date[] {
  const start = parseISO(dateKey);
  if (!isValid(start)) return [];
  return Array.from({ length: numberOfDays }, (_, index) => addDays(startOfDay(start), index));
}

export function bookingsOnScheduleDay(bookings: readonly WithId<Booking>[], day: Date): WithId<Booking>[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return bookings
    .filter((booking) => {
      const time = bookingScheduleDate(booking.bookingDate)?.getTime();
      return time !== undefined && time >= start && time < end;
    })
    .sort((a, b) => bookingScheduleDate(a.bookingDate)!.getTime() - bookingScheduleDate(b.bookingDate)!.getTime());
}
