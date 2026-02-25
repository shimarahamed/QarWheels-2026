// This page still uses mock data for bookings. Cars are fetched from Firestore.
'use client';
import { mockBookings } from "@/lib/data";
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
import { Car, Calendar, Wrench, CircleDollarSign, PlusCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Booking } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Car as CarType } from "@/lib/types";

function BookingCard({ booking, cars }: { booking: Booking, cars: CarType[] | null }) {
  const car = cars?.find((c) => c.id === booking.carId);
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

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg hover:border-primary">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{booking.serviceType}</CardTitle>
            <CardDescription>{booking.garageName}</CardDescription>
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
          <span>{format(new Date(booking.date), "PPP, p")}</span>
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

function BookingList({ bookings, cars }: { bookings: Booking[], cars: CarType[] | null }) {
  if (bookings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <Wrench className="mx-auto h-12 w-12 mb-4" />
        <p>No bookings found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} cars={cars} />
      ))}
    </div>
  );
}

export default function BookingsPage() {
  const { firestore, user } = useFirebase();
  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars } = useCollection<CarType>(carsCollection);

  const now = new Date();
  const upcomingBookings = mockBookings.filter(
    (b) => new Date(b.date) >= now && b.status === "Confirmed"
  ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastBookings = mockBookings.filter((b) => new Date(b.date) < now)
  .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">My Bookings</h1>
            <p className="text-muted-foreground">
            Manage your upcoming and past service appointments.
            </p>
        </div>
        <Button asChild>
            <Link href="/dashboard/garages">
                <PlusCircle className="mr-2 h-4 w-4" />
                Book New Service
            </Link>
        </Button>
      </header>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">History</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6">
          <BookingList bookings={upcomingBookings} cars={cars} />
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          <BookingList bookings={pastBookings} cars={cars} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
