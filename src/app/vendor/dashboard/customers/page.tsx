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
  import { PageHeader } from "@/components/ui/page-header";
  import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
  import { EmptyState } from "@/components/ui/empty-state";
  import { CalendarCheck, MoreHorizontal, Repeat, Users } from "lucide-react";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { format } from "date-fns";
  import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { collection, query, where, Timestamp } from "firebase/firestore";
  import type { Booking, WithId } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";


function CustomerRow({ userId, bookings, isLoadingBookings }: { userId: string; bookings: WithId<Booking>[] | null; isLoadingBookings: boolean }) {
    const firstBooking = bookings?.[0];

    const firstVisit = useMemo(() => {
        if (!bookings || bookings.length === 0) return null;
        return bookings.reduce((earliest, current) => {
            const currentDate = current.bookingDate instanceof Timestamp ? current.bookingDate.toDate() : new Date(current.bookingDate);
            const earliestDate = earliest.bookingDate instanceof Timestamp ? earliest.bookingDate.toDate() : new Date(earliest.bookingDate);
            return currentDate < earliestDate ? current : earliest;
        }).bookingDate;
    }, [bookings]);

    if (isLoadingBookings) {
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

    if (!firstBooking) return null;

    return (
        <TableRow>
            <TableCell className="font-medium">{firstBooking.customerName || 'Customer'}</TableCell>
            <TableCell className="hidden md:table-cell">
                <div>{firstBooking.customerPhone || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{firstBooking.customerEmail}</div>
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
    const { business, activeBranch, canSeeAllBranches } = useVendor();

    // Branch-scoped roles must filter on both businessId and branchId — see
    // the matching comment in vendor/dashboard/bookings/page.tsx.
    const bookingsQuery = useMemoFirebase(
        () =>
            canSeeAllBranches
                ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id))
                : activeBranch
                ? query(
                    collection(firestore, 'bookings'),
                    where('businessId', '==', business.id),
                    where('branchId', '==', activeBranch.id),
                  )
                : null,
        [firestore, business, activeBranch, canSeeAllBranches]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

    const bookingsByCustomer = useMemo(() => {
        const map = new Map<string, WithId<Booking>[]>();
        for (const booking of bookings || []) {
            const existing = map.get(booking.userId);
            if (existing) existing.push(booking);
            else map.set(booking.userId, [booking]);
        }
        return map;
    }, [bookings]);

    const uniqueCustomerIds = useMemo(() => [...bookingsByCustomer.keys()], [bookingsByCustomer]);

    const repeatCustomers = useMemo(
        () => [...bookingsByCustomer.values()].filter((list) => list.length > 1).length,
        [bookingsByCustomer],
    );

    const isLoading = isLoadingBookings;

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Customer directory"
          icon={<Users className="h-3.5 w-3.5" />}
          title="Everyone who has booked with you."
          description="A directory built automatically from your booking history — contact details, first visit, and repeat business at a glance."
        />

        <StatCardGrid>
          <StatCard
            label="Total customers"
            value={isLoading ? '—' : uniqueCustomerIds.length}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Total bookings"
            value={isLoading ? '—' : bookings?.length ?? 0}
            icon={<CalendarCheck className="h-4 w-4" />}
            accent="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            label="Repeat customers"
            value={isLoading ? '—' : repeatCustomers}
            icon={<Repeat className="h-4 w-4" />}
            accent="bg-violet-500/10 text-violet-600"
            hint="More than one booking"
          />
        </StatCardGrid>

        <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
                  <CustomerRow
                    key={userId}
                    userId={userId}
                    bookings={bookingsByCustomer.get(userId) || null}
                    isLoadingBookings={false}
                  />
                ))}
              </TableBody>
            </Table>
            {!isLoading && uniqueCustomerIds.length === 0 && (
                <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="No customer history yet"
                    description="Your customers will appear here after they make their first booking."
                />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
