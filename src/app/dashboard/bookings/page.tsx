'use client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Calendar, Wrench, CircleDollarSign, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Booking, WithId } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp } from "firebase/firestore";
import type { Car as CarType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function BookingCard({ booking, car }: { booking: WithId<Booking>, car?: WithId<CarType> }) {
  const getStatusVariant = (status: Booking["status"]) => {
    switch (status) {
      case "Confirmed":
        return "default";
      case "Completed":
        return "secondary";
      case "Cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const bookingDate = booking.bookingDate instanceof Timestamp 
    ? booking.bookingDate.toDate() 
    : new Date(booking.bookingDate);

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg hover:border-primary">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{booking.serviceName}</CardTitle>
            <CardDescription>{booking.vendorName}</CardDescription>
          </div>
          <Badge variant={getStatusVariant(booking.status)}>
            {booking.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        {car && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Car className="h-4 w-4" />
            <span>
              {car.year} {car.make} {car.model}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(bookingDate, "PPP, p")}</span>
        </div>
        {booking.cost && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span>QAR {booking.cost.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/bookings/${booking.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function BookingList({ bookings, cars, isLoading }: { bookings: WithId<Booking>[] | null, cars: WithId<CarType>[] | null, isLoading: boolean }) {
  if (isLoading) {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="space-y-4 p-4">
                    <div className="flex justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-24" />
                </Card>
            ))}
        </div>
    )
  }
  
  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <Wrench className="mx-auto h-12 w-12 mb-4" />
        <p>No bookings found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => {
        const car = cars?.find((c) => c.id === booking.carId);
        return <BookingCard key={booking.id} booking={booking} car={car} />
      })}
    </div>
  );
}

export default function BookingsPage() {
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars } = useCollection<WithId<CarType>>(carsCollection);

  const bookingsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'bookings'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const now = new Date();
  
  const upcomingBookings = bookings?.filter(
    (b) => new Date(b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : b.bookingDate) >= now && b.status === "Confirmed"
  ).sort((a,b) => new Date(a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : a.bookingDate).getTime() - new Date(b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : b.bookingDate).getTime());

  const pastBookings = bookings?.filter((b) => new Date(b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : b.bookingDate) < now)
  .sort((a,b) => new Date(b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : b.bookingDate).getTime() - new Date(a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : a.bookingDate).getTime());

  return (
    <div className="space-y-8">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">My Bookings</h1>
            <p className="text-muted-foreground">
            Manage your upcoming and past service appointments.
            </p>
        </div>
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">History</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          <BookingList bookings={upcomingBookings} cars={cars} isLoading={isLoadingBookings} />
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          <BookingList bookings={pastBookings} cars={cars} isLoading={isLoadingBookings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
