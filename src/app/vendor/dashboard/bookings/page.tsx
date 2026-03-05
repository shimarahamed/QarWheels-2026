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
import { MoreHorizontal, Edit, Loader2, Trash2 } from "lucide-react";
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
import { useFirebase, useCollection, useDoc, useMemoFirebase, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import { collection, query, where, doc, Timestamp, serverTimestamp } from "firebase/firestore";
import type { Booking, WithId, UserProfile, Car as CarType } from "@/lib/types";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Skeleton } from "@/components/ui/skeleton";


const editBookingSchema = z.object({
    status: z.enum(['Confirmed', 'Completed', 'Cancelled']),
    cost: z.coerce.number().min(0, "Cost must be a positive number"),
});

function EditBookingForm({ booking, onSave, onCancel, isSubmitting }: { booking: WithId<Booking>, onSave: (data: z.infer<typeof editBookingSchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
    const { control, register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof editBookingSchema>>({
        resolver: zodResolver(editBookingSchema),
        defaultValues: {
            status: booking.status,
            cost: booking.cost || 0,
        },
    });

    return (
        <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label htmlFor="status">Booking Status</Label>
                <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
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
             <div className="flex justify-end gap-2 pt-4">
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
  const { firestore } = useFirebase();

  const userRef = useMemoFirebase(
    () => (booking.userId ? doc(firestore, "users", booking.userId) : null),
    [firestore, booking.userId]
  );
  const { data: customer, isLoading: isLoadingCustomer } = useDoc<UserProfile>(userRef);

  const carRef = useMemoFirebase(
    () =>
      booking.userId && booking.carId
        ? doc(firestore, "users", booking.userId, "cars", booking.carId)
        : null,
    [firestore, booking.userId, booking.carId]
  );
  const { data: car, isLoading: isLoadingCar } = useDoc<CarType>(carRef);

  const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
        case 'Confirmed': return 'default';
        case 'Completed': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  const bookingDate = booking.bookingDate instanceof Timestamp 
    ? booking.bookingDate.toDate() 
    : new Date(booking.bookingDate);

  const isLoading = isLoadingCustomer || isLoadingCar;

  return (
    <TableRow>
      <TableCell>
        {isLoading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <div>
            <div className="font-medium">{customer ? `${customer.firstName} ${customer.lastName}`: 'Customer not found'}</div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {car ? `${car.year} ${car.make} ${car.model}` : 'Vehicle details unavailable'}
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{booking.serviceName}</TableCell>
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

function BookingsTable({ bookings, onEditClick, onDeleteClick, isLoading }: { bookings: WithId<Booking>[] | null, onEditClick: (booking: WithId<Booking>) => void, onDeleteClick: (booking: WithId<Booking>) => void, isLoading: boolean }) {
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
    const { vendor, isLoading: isLoadingVendor } = useVendor();
    const { toast } = useToast();

    const bookingsQuery = useMemoFirebase(
        () => (vendor ? query(collection(firestore, 'bookings'), where('vendorId', '==', vendor.id)) : null),
        [firestore, vendor]
    );
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);

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
        
        setIsSubmitting(true);
        const bookingRef = doc(firestore, 'bookings', selectedBooking.id);
        
        try {
            await safeUpdateDoc(bookingRef, {
                status: data.status,
                cost: data.cost,
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

    const isLoading = isLoadingVendor || isLoadingBookings;
    const now = new Date();
    
    const upcoming = bookings?.filter(b => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)) >= now && b.status === 'Confirmed').sort((a,b) => (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime() - (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime());
    const completed = bookings?.filter(b => b.status === "Completed").sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());
    const cancelled = bookings?.filter(b => b.status === "Cancelled").sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());
    const all = bookings?.sort((a,b) => (b.bookingDate instanceof Timestamp ? b.bookingDate.toDate() : new Date(b.bookingDate)).getTime() - (a.bookingDate instanceof Timestamp ? a.bookingDate.toDate() : new Date(a.bookingDate)).getTime());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Manage Bookings</h1>
        <p className="text-muted-foreground">
        View and manage all your customer appointments.
        </p>
      </header>
      <Card>
          <CardContent className="p-0">
          <Tabs defaultValue="upcoming">
              <div className="p-4 border-b">
                  <div className="overflow-x-auto no-scrollbar">
                        <TabsList className="inline-grid w-full grid-cols-4 min-w-[500px]">
                          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                          <TabsTrigger value="completed">Completed</TabsTrigger>
                          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                          <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                  </div>
              </div>
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
              {selectedBooking && <EditBookingForm booking={selectedBooking} onSave={handleSaveBooking} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} />}
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
