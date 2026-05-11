'use client';

import { useMemo } from 'react';
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
  Users,
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
            <TableCell className="hidden sm:table-cell">{booking.serviceName}</TableCell>
            <TableCell className="hidden md:table-cell">
                {format(booking.bookingDate instanceof Timestamp ? booking.bookingDate.toDate() : new Date(booking.bookingDate), "EEE, MMM d @ h:mm a")}
            </TableCell>
             <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/vendor/dashboard/bookings`}>View</Link>
                </Button>
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

  const totalRevenue = bookings
    ?.filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.cost || 0), 0) || 0;
  
  const totalCompletedJobs = bookings?.filter(b => b.status === 'Completed').length || 0;
  
  const shopRating = vendor?.rating || 0;

  const uniqueCustomerIds = useMemo(() => {
    if (!bookings) return [];
    const userIds = bookings.map(b => b.userId);
    return [...new Set(userIds)];
  }, [bookings]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Workshop Command Center</h1>
        <div className="text-muted-foreground">
          Welcome to your dashboard, {isLoading ? <Skeleton className="h-5 w-48 inline-block" /> : vendor?.name}.
        </div>
      </header>
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {isLoading ? <Skeleton className="h-6 w-20 sm:h-8 sm:w-32" /> : <div className="text-lg sm:text-2xl font-bold">QAR {totalRevenue.toFixed(0)}</div>}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Total completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Completed Jobs</CardTitle>
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {isLoading ? <Skeleton className="h-6 w-12 sm:h-8 sm:w-16" /> : <div className="text-lg sm:text-2xl font-bold">{totalCompletedJobs}</div>}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Services rendered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
             {isLoading ? <Skeleton className="h-6 w-12 sm:h-8 sm:w-16" /> : <div className="text-lg sm:text-2xl font-bold">{uniqueCustomerIds.length}</div>}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Clients served
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium">Shop Rating</CardTitle>
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
             {isLoading ? <Skeleton className="h-6 w-12 sm:h-8 sm:w-16" /> : <div className="text-lg sm:text-2xl font-bold">{shopRating.toFixed(1)}</div>}
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              From {vendor?.reviewCount || 0} revs
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
                            <TableHead className="hidden sm:table-cell">Service</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
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
