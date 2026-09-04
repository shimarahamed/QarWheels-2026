'use client';
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { CalendarClock, CheckCircle2, Clock3, Loader2, Sparkles, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase, useUser, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import { collection, limit as queryLimit, query, where, doc, Timestamp, serverTimestamp, arrayUnion } from "firebase/firestore";
import { canTransitionBooking } from "@/lib/types";
import type { Booking, InventoryItem, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingTableRow } from "@/components/vendor/bookings/booking-table-row";
import {
  EditBookingForm,
  type EditBookingValues,
  type StaffMember,
} from "@/components/vendor/bookings/edit-booking-form";

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
                    icon={<CalendarClock className="h-8 w-8" />}
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

    // Staff for the assignment picker comes from `memberships` — same query
    // shape as the vendor staff API route (`businessId` scopes the tenant).
    const staffRef = useMemoFirebase(
        () => query(collection(firestore, 'memberships'), where('businessId', '==', business.id)),
        [firestore, business]
    );
    const { data: staff } = useCollection<WithId<StaffMember>>(staffRef);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<WithId<Booking> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

        try {
            await safeUpdateDoc(bookingRef, {
                status: data.status,
                cost: data.cost,
                assignedStaffId: data.assignedStaffId || null,
                assignedStaffName: data.assignedStaffName || null,
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
        } catch(e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not update the booking.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setIsFormOpen(false);
            setSelectedBooking(null);
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Job control board"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title="Bookings, ready for the workshop floor."
        description="Track incoming jobs, close completed work, update costs, and keep your service pipeline tidy."
      />

      <StatCardGrid>
        <StatCard
          label="Pending"
          value={pending?.length || 0}
          icon={<Clock3 className="h-4 w-4" />}
          accent="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Upcoming"
          value={upcoming?.length || 0}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Done"
          value={completed?.length || 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Cancelled"
          value={cancelled?.length || 0}
          icon={<XCircle className="h-4 w-4" />}
          accent="bg-destructive/10 text-destructive"
        />
      </StatCardGrid>

      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-0">
          <Tabs defaultValue="pending">
              <div className="p-4 border-b">
                  <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-5 h-auto">
                        <TabsTrigger value="pending" className="relative text-xs sm:text-sm px-1.5 sm:px-3">
                          Requests
                          {!!pending?.length && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
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
