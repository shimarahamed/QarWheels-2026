'use client';
import { useState } from "react";
import { useForm, Controller }from "react-hook-form";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, Clock3, MoreHorizontal, Edit, Loader2, Trash2, Sparkles, XCircle, Package, UserCheck, Plus, Minus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase, useUser, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import { collection, limit as queryLimit, query, where, doc, Timestamp, serverTimestamp, arrayUnion } from "firebase/firestore";
import { BOOKING_TRANSITIONS, canTransitionBooking } from "@/lib/types";
import type { Booking, BookingStatus, InventoryItem, WithId } from "@/lib/types";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Skeleton } from "@/components/ui/skeleton";

// NOTE: staff/membership is deferred to a later phase — this stands in for the
// deleted StaffMember type so the assignment picker keeps compiling against the
// legacy `vendors/{businessId}/staff` subcollection.
type StaffMember = {
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Inactive';
};

const BOOKING_STATUSES = [
    'Pending',
    'Confirmed',
    'VehicleReceived',
    'InProgress',
    'ReadyForPickup',
    'Completed',
    'Declined',
    'Cancelled',
    'NoShow',
] as const;

const editBookingSchema = z.object({
    status: z.enum(BOOKING_STATUSES),
    cost: z.coerce.number().min(0, "Cost must be a positive number"),
    assignedStaffId: z.string().optional(),
    assignedStaffName: z.string().optional(),
    partsUsed: z.array(z.object({
        inventoryItemId: z.string(),
        name: z.string(),
        qty: z.coerce.number().int().min(1),
        unitPrice: z.number(),
    })).optional(),
});

function EditBookingForm({
    booking,
    onSave,
    onCancel,
    isSubmitting,
    inventory,
    staff,
}: {
    booking: WithId<Booking>;
    onSave: (data: z.infer<typeof editBookingSchema>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    inventory: WithId<InventoryItem>[] | null | undefined;
    staff: WithId<StaffMember>[] | null | undefined;
}) {
    const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.infer<typeof editBookingSchema>>({
        resolver: zodResolver(editBookingSchema),
        defaultValues: {
            status: booking.status,
            cost: booking.cost || 0,
            assignedStaffId: booking.assignedStaffId || '',
            assignedStaffName: booking.assignedStaffName || '',
            partsUsed: booking.partsUsed || [],
        },
    });
    // Current status stays selectable (a no-op save), plus every legal next state.
    const statusOptions: BookingStatus[] = [booking.status, ...BOOKING_TRANSITIONS[booking.status]];
    const partsUsed = watch('partsUsed') || [];

    function addPart(item: WithId<InventoryItem>) {
        const existing = partsUsed.find(p => p.inventoryItemId === item.id);
        if (existing) {
            setValue('partsUsed', partsUsed.map(p =>
                p.inventoryItemId === item.id ? { ...p, qty: p.qty + 1 } : p
            ));
        } else {
            setValue('partsUsed', [...partsUsed, { inventoryItemId: item.id, name: item.name, qty: 1, unitPrice: item.price }]);
        }
    }

    function removePart(itemId: string) {
        const existing = partsUsed.find(p => p.inventoryItemId === itemId);
        if (!existing) return;
        if (existing.qty <= 1) {
            setValue('partsUsed', partsUsed.filter(p => p.inventoryItemId !== itemId));
        } else {
            setValue('partsUsed', partsUsed.map(p =>
                p.inventoryItemId === itemId ? { ...p, qty: p.qty - 1 } : p
            ));
        }
    }

    const partsTotal = partsUsed.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
    const activeStaff = (staff || []).filter(s => s.status === 'Active');

    return (
        <form onSubmit={handleSubmit(onSave)} className="space-y-5 pt-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Status + Cost */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((status) => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cost">Final Cost (QAR)</Label>
                    <Input id="cost" type="number" step="0.01" {...register("cost")} />
                    {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
                </div>
            </div>

            {/* Staff assignment */}
            {activeStaff.length > 0 && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Assign Staff
                    </Label>
                    <Controller
                        control={control}
                        name="assignedStaffId"
                        render={({ field }) => (
                            <Select
                                onValueChange={(val) => {
                                    field.onChange(val);
                                    const member = activeStaff.find(s => s.id === val);
                                    setValue('assignedStaffName', member?.name || '');
                                }}
                                value={field.value}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Unassigned</SelectItem>
                                    {activeStaff.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name} — {s.role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            )}

            {/* Parts used */}
            {inventory && inventory.length > 0 && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Parts Used
                    </Label>
                    <div className="rounded-lg border divide-y text-sm">
                        {inventory.map((item) => {
                            const used = partsUsed.find(p => p.inventoryItemId === item.id);
                            return (
                                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">QAR {item.price.toFixed(2)} · {item.stock} in stock</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {used ? (
                                            <>
                                                <Button type="button" size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => removePart(item.id)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-5 text-center font-bold">{used.qty}</span>
                                                <Button type="button" size="icon" variant="outline" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => addPart(item)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addPart(item)}>
                                                <Plus className="mr-1 h-3 w-3" /> Add
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {partsUsed.length > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                            Parts subtotal: <span className="font-semibold text-foreground">QAR {partsTotal.toFixed(2)}</span>
                        </p>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
    );
}

function BookingTableRow({
  booking,
  onEditClick,
  onDeleteClick,
}: {
  booking: WithId<Booking>;
  onEditClick: (booking: WithId<Booking>) => void;
  onDeleteClick: (booking: WithId<Booking>) => void;
}) {
  const getStatusVariant = (status: BookingStatus) => {
    switch (status) {
        case 'Confirmed':
        case 'VehicleReceived':
        case 'InProgress':
        case 'ReadyForPickup':
            return 'default';
        case 'Completed': return 'secondary';
        case 'Cancelled':
        case 'Declined':
        case 'NoShow':
            return 'destructive';
        default: return 'outline';
    }
  }

  const bookingDate = booking.bookingDate instanceof Timestamp 
    ? booking.bookingDate.toDate() 
    : new Date(booking.bookingDate);

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{booking.customerName || 'Customer not found'}</div>
          <div className="text-sm text-muted-foreground hidden md:block">
            {booking.carDescription || 'Vehicle details unavailable'}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div>{booking.serviceName}</div>
        {booking.assignedStaffName && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <UserCheck className="h-3 w-3" />{booking.assignedStaffName}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {format(bookingDate, "PPP p")}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onEditClick(booking)}>
              <Edit className="mr-2 h-4 w-4" /> Update Status/Cost
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDeleteClick(booking)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
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
            <div className="text-center text-muted-foreground p-8">
                <p>No bookings in this category.</p>
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

    const bookingsQuery = useMemoFirebase(
        () =>
            canSeeAllBranches
                ? query(collection(firestore, 'bookings'), where('businessId', '==', business.id), queryLimit(100))
                : activeBranch
                ? query(collection(firestore, 'bookings'), where('branchId', '==', activeBranch.id), queryLimit(100))
                : null,
        [firestore, business, activeBranch, canSeeAllBranches]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

    const inventoryQuery = useMemoFirebase(
        () => activeBranch ? query(collection(firestore, 'branch_inventory'), where('branchId', '==', activeBranch.id)) : null,
        [firestore, activeBranch]
    );
    const { data: inventory } = useCollection<WithId<InventoryItem>>(inventoryQuery);

    // Staff still reads the legacy subcollection — the memberships migration is
    // a later phase.
    const staffRef = useMemoFirebase(() => collection(firestore, 'vendors', business.id, 'staff'), [firestore, business]);
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

    const handleSaveBooking = async (data: z.infer<typeof editBookingSchema>) => {
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
                              // branch_manager has no history role of its own —
                              // it records as branch_staff.
                              byRole: role === 'business_owner' ? 'business_owner' : role === 'business_admin' ? 'business_admin' : 'branch_staff',
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
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Job control board
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bookings, ready for the workshop floor.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track incoming jobs, close completed work, update costs, and keep your service pipeline tidy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[520px] sm:grid-cols-4">
            <div className="rounded-xl border bg-background/70 p-3">
              <Clock3 className="mb-2 h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pending?.length || 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <CalendarClock className="mb-2 h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="text-xl font-bold">{upcoming?.length || 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Done</p>
              <p className="text-xl font-bold">{completed?.length || 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <XCircle className="mb-2 h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-xl font-bold">{cancelled?.length || 0}</p>
            </div>
          </div>
        </div>
      </header>
      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-0">
          <Tabs defaultValue="pending">
              <div className="p-4 border-b">
                  <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-5 h-auto">
                        <TabsTrigger value="pending" className="text-xs sm:text-sm px-1.5 sm:px-3">Pending</TabsTrigger>
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
