'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  Wrench,
  Star,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OverviewChart } from "@/components/vendor/overview-chart";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import { collection, query, where, Timestamp, doc } from "firebase/firestore";
import type { Booking, UserProfile, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function UpcomingBookingRow({ booking }: { booking: WithId<Booking> }) {
    const { firestore } = useFirebase();

    const userRef = useMemoFirebase(
      () => (booking.userId ? doc(firestore, 'users', booking.userId) : null),
      [firestore, booking.userId]
    );
    const { data: customer, isLoading } = useDoc<UserProfile>(userRef);

    return (
        <TableRow key={booking.id}>
            <TableCell>
                {isLoading ? <Skeleton className="h-5 w-24" /> : (
                    <div className="font-medium">{customer ? `${customer.firstName} ${customer.lastName}` : 'Customer'}</div>
                )}
            </TableCell>
            <TableCell>{booking.serviceName}</TableCell>
            <TableCell>
                {format(booking.bookingDate instanceof Timestamp ? booking.bookingDate.toDate() : new Date(booking.bookingDate), "EEE, MMM d @ h:mm a")}
            </TableCell>
        </TableRow>
    )
}


export default function VendorDashboard() {
  const { firestore } = useFirebase();
  const { vendor, isLoading: isLoadingVendor } = useVendor();

  const bookingsQuery = useMemoFirebase(
    () => (vendor ? query(collection(firestore, 'bookings'), where('vendorId', '==', vendor.id)) : null),
    [firestore, vendor]
  );
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const isLoading = isLoadingVendor || isLoadingBookings;

  const upcomingBookings = bookings
    ?.filter((b) => b.status === "Confirmed" && (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)) >= new Date())
    .sort((a, b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime())
    .slice(0, 5);

  const todayRevenue = bookings
    ?.filter(
      (b) =>
        b.status === "Completed" &&
        new Date(b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).toDateString() === new Date().toDateString()
    )
    .reduce((sum, b) => sum + (b.cost || 0), 0) || 0;

  const inProgressCount = bookings?.filter(
    (b) => b.status === "Confirmed" // Using "Confirmed" as a proxy for active jobs
  ).length || 0;
  
  const shopRating = vendor?.rating || 0;
  const pendingQuotes = 0; // Placeholder as this is not in the data model yet

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Workshop Command Center</h1>
        <p className="text-muted-foreground">
          Welcome to your dashboard, {isLoading ? <Skeleton className="h-5 w-48 inline-block" /> : vendor?.name}.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-bold">QAR {todayRevenue.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">
              Based on completed jobs today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">+{inProgressCount}</div>}
            <p className="text-xs text-muted-foreground">
              Confirmed upcoming jobs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">
              Feature coming soon
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{shopRating.toFixed(1)}</div>}
            <p className="text-xs text-muted-foreground">
              Based on customer reviews
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
             <CardDescription>
              A summary of your revenue over the last 6 months. (Mock Data)
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart timeRange="last_6_months" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>
                These are your next 5 upcoming jobs.
                </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/vendor/dashboard/bookings">
                View All
                </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                  <TableBody>
                    {upcomingBookings.map((booking) => (
                      <UpcomingBookingRow key={booking.id} booking={booking} />
                    ))}
                  </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming bookings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
