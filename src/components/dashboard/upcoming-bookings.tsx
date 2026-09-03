'use client';

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, limit as queryLimit, query, where, Timestamp } from "firebase/firestore";
import type { Booking, WithId } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingPanel } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

function BookingItem({ booking }: { booking: WithId<Booking> }) {
  const bookingDate = booking.bookingDate instanceof Timestamp
    ? booking.bookingDate.toDate()
    : new Date(booking.bookingDate);

  return (
    <Link
      href={`/dashboard/bookings/${booking.id}`}
      className="motion-surface block rounded-xl border bg-background/70 p-3 transition-colors hover:border-primary/40"
    >
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">{booking.serviceName}</p>
                <p className="truncate text-sm text-muted-foreground">{booking.branchName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge status={booking.status} />
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(bookingDate, "MMM d, yyyy")}
                </span>
            </div>
        </div>
    </Link>
  )
}

export function UpcomingBookings() {
    const { firestore, user } = useFirebase();

    const upcomingBookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'Confirmed'), queryLimit(10)) : null),
    [firestore, user]
  );
  const { data: bookings, isLoading } = useCollection<WithId<Booking>>(upcomingBookingsQuery);

  const upcoming = bookings
    ?.filter(b => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)) >= new Date())
    .sort((a,b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime())
    .slice(0, 3);

    return (
        <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your next few scheduled services.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <LoadingPanel rows={2} />}
                {!isLoading && (!upcoming || upcoming.length === 0) && (
                    <EmptyState
                        icon={<CalendarIcon className="h-8 w-8" />}
                        title="No upcoming bookings"
                        description="Book a garage visit and it will show up here."
                        action={
                            <Button asChild>
                                <Link href="/dashboard/garages">Book a Service</Link>
                            </Button>
                        }
                    />
                )}
                {!isLoading && upcoming && upcoming.length > 0 && (
                     <div className="space-y-2">
                        {upcoming.map(booking => <BookingItem key={booking.id} booking={booking} />)}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
