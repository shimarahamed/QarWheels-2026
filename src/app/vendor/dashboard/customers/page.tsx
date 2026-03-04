'use client';
import { useMemo } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Button } from "@/components/ui/button";
  import { MoreHorizontal, Mail, Phone, Loader2 } from "lucide-react";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { format } from "date-fns";
  import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { collection, query, where, doc, Timestamp } from "firebase/firestore";
  import type { Booking, WithId, UserProfile, Car as CarType } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";


function CustomerRow({ userId }: { userId: string }) {
    const { firestore } = useFirebase();

    const userRef = useMemoFirebase(
        () => doc(firestore, 'users', userId),
        [firestore, userId]
    );
    const { data: user, isLoading: isLoadingUser } = useDoc<UserProfile>(userRef);

    const firstBookingQuery = useMemoFirebase(
        () => query(collection(firestore, 'bookings'), where('userId', '==', userId)),
        [firestore, userId]
    )
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(firstBookingQuery);

    const firstVisit = useMemo(() => {
        if (!bookings || bookings.length === 0) return null;
        return bookings.reduce((earliest, current) => {
            const currentDate = current.bookingDate instanceof Timestamp ? current.bookingDate.toDate() : new Date(current.bookingDate);
            const earliestDate = earliest.bookingDate instanceof Timestamp ? earliest.bookingDate.toDate() : new Date(earliest.bookingDate);
            return currentDate < earliestDate ? current : earliest;
        }).bookingDate;
    }, [bookings]);

    if (isLoadingUser || isLoadingBookings) {
        return (
            <TableRow>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
        )
    }

    if (!user) return null; // or show some fallback

    return (
        <TableRow>
            <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
            <TableCell className="hidden md:table-cell">
                <div>{user.phoneNumber || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{firstVisit ? format(firstVisit instanceof Timestamp ? firstVisit.toDate() : new Date(firstVisit), "PPP") : 'N/A'}</TableCell>
            <TableCell>{bookings?.length || 0}</TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem disabled>View Booking History</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

export default function VendorCustomersPage() {
    const { firestore } = useFirebase();
    const { vendor, isLoading: isLoadingVendor } = useVendor();

    const bookingsQuery = useMemoFirebase(
        () => (vendor ? query(collection(firestore, 'bookings'), where('vendorId', '==', vendor.id)) : null),
        [firestore, vendor]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

    const uniqueCustomerIds = useMemo(() => {
        if (!bookings) return [];
        const userIds = bookings.map(b => b.userId);
        return [...new Set(userIds)];
    }, [bookings]);

    const isLoading = isLoadingVendor || isLoadingBookings;

    return (
      <div className="space-y-8">
        <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Customer Directory</h1>
            <p className="text-muted-foreground">
                A list of all clients who have booked a service with you.
            </p>
          </div>
        </header>
        <Card>
            <CardHeader>
                <CardTitle>Your Customers</CardTitle>
                <CardDescription>This list is automatically generated from your booking history.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">First Visit</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                             <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))
                )}
                {!isLoading && uniqueCustomerIds.map((userId) => (
                  <CustomerRow key={userId} userId={userId} />
                ))}
              </TableBody>
            </Table>
            {!isLoading && uniqueCustomerIds.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                    <p>No customer history yet. Your customers will appear here after they make their first booking.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
