'use client';

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp } from "firebase/firestore";
import type { Booking, WithId } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

function BookingItem({ booking }: { booking: WithId<Booking> }) {
  const bookingDate = booking.bookingDate instanceof Timestamp 
    ? booking.bookingDate.toDate() 
    : new Date(booking.bookingDate);

  return (
    <Link href={`/dashboard/bookings/${booking.id}`} className="block p-4 -mx-4 rounded-lg hover:bg-secondary">
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
                <p className="font-semibold">{booking.serviceName}</p>
                <p className="text-sm text-muted-foreground">{booking.vendorName}</p>
            </div>
            <div className="text-sm text-right text-muted-foreground whitespace-nowrap">
                {format(bookingDate, "MMM d, yyyy")}
            </div>
        </div>
    </Link>
  )
}

export function UpcomingBookings() {
    const { firestore, user } = useFirebase();

    const upcomingBookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'Confirmed')) : null),
    [firestore, user]
  );
  const { data: bookings, isLoading } = useCollection<WithId<Booking>>(upcomingBookingsQuery);

  const upcoming = bookings
    ?.filter(b => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)) >= new Date())
    .sort((a,b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime())
    .slice(0, 3);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your next few scheduled services.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                )}
                {!isLoading && (!upcoming || upcoming.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                        <p className="text-sm">No upcoming bookings.</p>
                         <Button asChild variant="secondary" size="sm" className="mt-4">
                            <Link href="/dashboard/garages">Book a Service</Link>
                        </Button>
                    </div>
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
