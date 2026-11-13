'use client';
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase, useUser, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import { useStaffRoster } from "@/hooks/use-staff-roster";
import { collection, limit as queryLimit, query, where, doc, Timestamp, serverTimestamp, arrayUnion } from "firebase/firestore";
import { canTransitionBooking } from "@/lib/types";
import type { Booking, InventoryItem, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTableRow } from "@/components/vendor/bookings/booking-table-row";
import {
  EditBookingForm,
  type EditBookingValues,
} from "@/components/vendor/bookings/edit-booking-form";

function toBookingDate(value: Booking['bookingDate']) {
    return value instanceof Timestamp ? value.toDate() : new Date(value);
}

/**
 * Groups today's/upcoming in-flight bookings by technician so the shape of
 * the day is visible at a glance — the mockups asked for a bay-schedule
 * Gantt, but bookings have no real bay/slot field, so this groups by
 * `assignedStaffName` instead (the one real "who's working on what, when"
 * axis this data actually has). Unassigned jobs get their own lane.
 */
function BookingTimelineView({ bookings, isLoading }: { bookings: WithId<Booking>[] | null | undefined; isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
        );
    }

    const inFlight = (bookings ?? [])
        .filter((b) => !['Completed', 'Cancelled', 'Declined', 'NoShow'].includes(b.status))
        .sort((a, b) => toBookingDate(a.bookingDate).getTime() - toBookingDate(b.bookingDate).getTime());

    if (inFlight.length === 0) {
        return (
            <div className="p-2 sm:p-4">
                <EmptyState
                    icon={<MaterialIcon name="view_timeline" className="text-3xl" />}
                    title="Nothing on the schedule"
                    description="Jobs land here once they're confirmed and in progress."
                />
            </div>
        );
    }

    const lanes = new Map<string, WithId<Booking>[]>();
    for (const booking of inFlight) {
        const key = booking.assignedStaffName || 'Unassigned';
        if (!lanes.has(key)) lanes.set(key, []);
        lanes.get(key)!.push(booking);
    }
    // Unassigned last — technicians with real names lead the board.
    const sortedLanes = [...lanes.entries()].sort(([a], [b]) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="grid gap-3 p-2 sm:p-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedLanes.map(([name, jobs]) => (
                <div key={name} className="flex flex-col gap-2 rounded-xl border bg-background/60 p-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <span className="icon-pill h-7 w-7 shrink-0 bg-primary/10 text-primary">
                            <MaterialIcon name={name === 'Unassigned' ? 'person_off' : 'engineering'} className="text-sm" />
                        </span>
                        <p className="truncate text-sm font-bold">{name}</p>
                        <span className="kpi-number ml-auto shrink-0 text-xs text-muted-foreground">{jobs.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {jobs.map((job) => (
                            <div key={job.id} className="rounded-lg border border-border/60 bg-card px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-semibold">{job.serviceName}</p>
                                    <StatusBadge status={job.status} className="shrink-0 px-1.5 py-0.5 text-[9px]" />
                                </div>
                                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                    <MaterialIcon name="schedule" className="text-xs" />
                                    {format(toBookingDate(job.bookingDate), 'MMM d, h:mm a')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BookingsTable({ bookings, onEditClick, onDeleteClick, isLoading }: { bookings: WithId<Booking>[] | null | undefined, onEditClick: (booking: WithId<Booking>) => void, onDeleteClick: (booking: WithId<Booking>) => void, isLoading: boolean }) {
    if (isLoading) {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden sm:table-cell">Service</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                         <TableRow key={i}>
                             <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                             <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                             <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                             <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                             <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                         </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    if (!bookings || bookings.length === 0) {
        return (
            <div className="p-2 sm:p-4">
                <EmptyState
                    icon={<MaterialIcon name="event_note" className="text-3xl" />}
                    title="No bookings in this category"
                    description="Jobs land here as customers book them, and move along as you accept and complete the work."
                />
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Service</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {bookings.map((booking) => (
                <BookingTableRow
                    key={booking.id}
                    booking={booking}
                    onEditClick={onEditClick}
                    onDeleteClick={onDeleteClick}
                />
            ))}
            </TableBody>
      </Table>
    )
}

export default function VendorBookingsPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { business, activeBranch, canSeeAllBranches, role } = useVendor();
    const { toast } = useToast();

    // Branch-scoped roles must filter on both businessId and branchId —
    // firestore.rules' isBookingActor() checks both fields, and a branchId-only
    // query can't prove businessId too (it genuinely varies per matching
    // doc), so Firestore denies the whole list. Business-wide roles don't
    // need branchId here: isBookingActor resolves them via isBusinessMember,
    // a claim comparison against the query's own businessId filter alone.
    const bookingsQuery = useMemoFirebase(
        () =>
            canSeeAllBranches
                ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id), queryLimit(100))
                : activeBranch
                ? query(
                    collection(firestore, 'bookings'),
                    where('businessId', '==', business.id),
                    where('branchId', '==', activeBranch.id),
                    queryLimit(100),
                  )
                : null,
        [firestore, business, activeBranch, canSeeAllBranches]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

    const inventoryQuery = useMemoFirebase(
        () => activeBranch
            ? query(
                collection(firestore, 'branch_inventory'),
                where('businessId', '==', business.id),
                where('branchId', '==', activeBranch.id),
              )
            : null,
        [firestore, business, activeBranch]
    );
    const { data: inventory } = useCollection<WithId<InventoryItem>>(inventoryQuery);

    // Staff for the assignment picker — client `list` queries against
    // `memberships` are rejected by firestore.rules, so this reads through
    // /api/vendor/staff/roster instead (see useStaffRoster).
    const { data: staff } = useStaffRoster(business.id);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<WithId<Booking> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState<'table' | 'timeline'>('table');

    const handleEditClick = (booking: WithId<Booking>) => {
        setSelectedBooking(booking);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (booking: WithId<Booking>) => {
        setSelectedBooking(booking);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveBooking = async (data: EditBookingValues) => {
        if (!selectedBooking) return;
        if (!canTransitionBooking(selectedBooking.status, data.status)) {
            toast({
                title: "Invalid status change",
                description: `A booking in ${selectedBooking.status} cannot be changed to ${data.status}.`,
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        const bookingRef = doc(firestore, 'bookings', selectedBooking.id);
        const statusChanged = data.status !== selectedBooking.status;
        const assignmentChanged = (data.assignedStaffId || null) !== (selectedBooking.assignedStaffId || null);
        let assignmentSaved = false;

        try {
            if (assignmentChanged) {
                if (!user) throw new Error('Sign in to assign staff.');
                const token = await user.getIdToken();
                const response = await fetch(`/api/bookings/${selectedBooking.id}/assignment`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ membershipId: data.assignedStaffId || null }),
                });
                if (!response.ok) {
                    const result = await response.json().catch(() => null);
                    throw new Error(result?.error || 'Could not save assignment.');
                }
                assignmentSaved = true;
                setSelectedBooking((current) => current?.id === selectedBooking.id
                    ? { ...current, assignedStaffId: data.assignedStaffId || undefined, assignedStaffName: staff?.find((member) => member.id === data.assignedStaffId)?.displayName }
                    : current);
            }
            await safeUpdateDoc(bookingRef, {
                status: data.status,
                cost: data.cost,
                partsUsed: data.partsUsed || [],
                // Security rules require statusHistory to grow by exactly one
                // entry whenever branch staff touch the booking.
                ...(statusChanged
                    ? {
                          statusHistory: arrayUnion({
                              status: data.status,
                              at: Timestamp.now(),
                              byUid: user?.uid ?? '',
                              // MembershipRole is a subset of BookingActorRole, so the
                              // actor's real role is recorded as-is — no collapsing to
                              // a generic "staff" the way this used to.
                              byRole: role,
                          }),
                      }
                    : {}),
                updatedAt: serverTimestamp(),
            });
            toast({
                title: "Booking Updated",
                description: `The booking has been updated.`,
            });
            setIsFormOpen(false);
            setSelectedBooking(null);
        } catch(e) {
            console.error(e);
            toast({
                title: assignmentSaved ? "Assignment saved, booking details not saved" : "Booking not updated",
                description: e instanceof Error ? e.message : "Could not update the booking. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedBooking) return;
        setIsSubmitting(true);
        const bookingRef = doc(firestore, 'bookings', selectedBooking.id);

        try {
            await safeDeleteDoc(bookingRef);
            toast({
                title: "Booking Deleted",
                description: `The booking has been deleted.`,
                variant: "destructive"
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not delete the booking.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setIsDeleteConfirmOpen(false);
            setSelectedBooking(null);
        }
    }

    const isLoading = isLoadingBookings;
    const now = new Date();

    const pending = bookings?.filter(b => b.status === "Pending").sort((a,b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime());
    const upcoming = bookings?.filter(b => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)) >= now && b.status === 'Confirmed').sort((a,b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime());
    const completed = bookings?.filter(b => b.status === "Completed").sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());
    const cancelled = bookings?.filter(b => b.status === "Cancelled").sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());
    const all = bookings?.sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        eyebrow="Job control board"
        icon={<MaterialIcon name="auto_awesome" className="text-sm" />}
        title="Bookings, ready for the workshop floor."
        description="Track incoming jobs, close completed work, update costs, and keep your service pipeline tidy."
        action={
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1">
            <Button
              size="sm"
              variant={view === 'table' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setView('table')}
            >
              <MaterialIcon name="table_rows" className="text-sm" />
              Table
            </Button>
            <Button
              size="sm"
              variant={view === 'timeline' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setView('timeline')}
            >
              <MaterialIcon name="view_timeline" className="text-sm" />
              Timeline
            </Button>
          </div>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Pending"
          value={pending?.length || 0}
          icon={<MaterialIcon name="schedule" className="text-base" />}
          accent="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Upcoming"
          value={upcoming?.length || 0}
          icon={<MaterialIcon name="event_upcoming" className="text-base" />}
        />
        <StatCard
          label="Done"
          value={completed?.length || 0}
          icon={<MaterialIcon name="task_alt" className="text-base" />}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Cancelled"
          value={cancelled?.length || 0}
          icon={<MaterialIcon name="cancel" className="text-base" />}
          accent="bg-destructive/10 text-destructive"
        />
      </StatCardGrid>

      {view === 'timeline' ? (
        <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <CardContent className="p-0">
            <BookingTimelineView bookings={bookings} isLoading={isLoading} />
          </CardContent>
        </Card>
      ) : (
      <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <CardContent className="p-0">
          <Tabs defaultValue="pending">
              <div className="p-4 border-b">
                  <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-5 h-auto">
                        <TabsTrigger value="pending" className="relative text-xs sm:text-sm px-1.5 sm:px-3">
                          Requests
                          {!!pending?.length && (
                            <span className="kpi-number absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                              {pending.length}
                            </span>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="text-xs sm:text-sm px-1.5 sm:px-3">Upcoming</TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs sm:text-sm px-1.5 sm:px-3">Completed</TabsTrigger>
                        <TabsTrigger value="cancelled" className="text-xs sm:text-sm px-1.5 sm:px-3">Cancelled</TabsTrigger>
                        <TabsTrigger value="all" className="text-xs sm:text-sm px-1.5 sm:px-3">All</TabsTrigger>
                    </TabsList>
              </div>
              <TabsContent value="pending" className="p-1 sm:p-4">
                  <BookingsTable bookings={pending} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="upcoming" className="p-1 sm:p-4">
                  <BookingsTable bookings={upcoming} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="completed" className="p-1 sm:p-4">
                  <BookingsTable bookings={completed} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="cancelled" className="p-1 sm:p-4">
                  <BookingsTable bookings={cancelled} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isLoading={isLoading} />
              </TabsContent>
              <TabsContent value="all" className="p-1 sm:p-4">
                  <BookingsTable bookings={all} onEditClick={handleEditClick} onDeleteClick={handleDeleteClick} isLoading={isLoading} />
              </TabsContent>
          </Tabs>
          </CardContent>
      </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) setSelectedBooking(null); setIsFormOpen(open);}}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Update Booking</DialogTitle>
                  {selectedBooking && (
                      <DialogDescription>
                          Update the status and cost for the booking on {format(selectedBooking.bookingDate instanceof Timestamp ? selectedBooking.bookingDate.toDate() : new Date(selectedBooking.bookingDate), "PPP")}.
                      </DialogDescription>
                  )}
              </DialogHeader>
              {selectedBooking && <EditBookingForm booking={selectedBooking} onSave={handleSaveBooking} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} inventory={inventory} staff={staff} />}
          </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the booking.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
