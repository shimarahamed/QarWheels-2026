'use client';
import { useState, useEffect } from "react";
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
import { mockVendorBookings, VendorBooking } from "@/lib/vendor-data";
import { format } from "date-fns";
import { MoreHorizontal, Edit, Phone, Car, Calendar, CircleDollarSign, PlusCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


function getStatusVariant(status: VendorBooking['status']) {
    switch (status) {
        case 'Upcoming': return 'default';
        case 'Completed': return 'secondary';
        case 'In Progress': return 'outline';
        case 'Cancelled': return 'destructive';
        default: return 'default';
    }
}

function BookingForm({ booking, onSave, onCancel }: { booking?: VendorBooking | null, onSave: (data: VendorBooking) => void, onCancel: () => void }) {
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<VendorBooking>({
        defaultValues: booking || { status: 'Upcoming' },
    });
    const { toast } = useToast();

    useEffect(() => {
        reset(booking || { status: 'Upcoming', customerName: '', carModel: '', service: '', cost: 0, customerPhone: '' });
    }, [booking, reset]);

    const onSubmit = (data: VendorBooking) => {
        toast({
            title: booking ? "Booking Updated" : "Booking Created",
            description: `Booking for ${data.customerName} has been saved.`,
        });
        onSave(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" {...register("customerName", { required: "Customer name is required" })} />
                {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="carModel">Car Model</Label>
                <Input id="carModel" {...register("carModel", { required: "Car model is required" })} />
                {errors.carModel && <p className="text-sm text-destructive">{errors.carModel.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="service">Service</Label>
                <Input id="service" {...register("service", { required: "Service is required" })} />
                {errors.service && <p className="text-sm text-destructive">{errors.service.message}</p>}
            </div>
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
                                <SelectItem value="Upcoming">Upcoming</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="cost">Cost (QAR)</Label>
                <Input id="cost" type="number" step="0.01" {...register("cost", { required: "Cost is required", valueAsNumber: true })} />
                {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
            </div>
             <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
    );
}

function BookingsTable({ bookings, onRowClick, onDeleteClick }: { bookings: VendorBooking[], onRowClick: (booking: VendorBooking) => void, onDeleteClick: (booking: VendorBooking) => void }) {
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
                <TableRow key={booking.id} onClick={() => onRowClick(booking)} className="cursor-pointer">
                    <TableCell>
                        <div className="font-medium">{booking.customerName}</div>
                        <div className="text-sm text-muted-foreground hidden md:block">{booking.carModel}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{booking.service}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        {format(new Date(booking.date), "PPP p")}
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
                                <DropdownMenuItem onSelect={() => onRowClick(booking)}>
                                    <Edit className="mr-2 h-4 w-4" /> View & Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild onSelect={(e) => e.preventDefault()}>
                                     <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteClick(booking); }}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
      </Table>
    )
}

export default function VendorBookingsPage() {
    const [bookings, setBookings] = useState(mockVendorBookings);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<VendorBooking | null>(null);
    const { toast } = useToast();

    const handleRowClick = (booking: VendorBooking) => {
        setSelectedBooking(booking);
        setIsFormOpen(true);
    };

     const handleAddNewClick = () => {
        setSelectedBooking(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (booking: VendorBooking) => {
        setSelectedBooking(booking);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveBooking = (data: VendorBooking) => {
        if (selectedBooking && selectedBooking.id) {
            // Update
            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {...data, id: selectedBooking.id, date: selectedBooking.date} : b));
        } else {
            // Create
            const newBooking = { ...data, id: `vb-${Date.now()}`, date: new Date().toISOString() };
            setBookings(prev => [newBooking, ...prev]);
        }
        setIsFormOpen(false);
        setSelectedBooking(null);
    };

    const handleDeleteConfirm = () => {
        if (!selectedBooking) return;
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        toast({
            title: "Booking Deleted",
            description: `The booking for ${selectedBooking.customerName} has been deleted.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedBooking(null);
    }

    const upcoming = bookings.filter(b => b.status === "Upcoming").sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const inProgress = bookings.filter(b => b.status === "In Progress").sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const completed = bookings.filter(b => b.status === "Completed").sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const cancelled = bookings.filter(b => b.status === "Cancelled").sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const all = [...bookings].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Manage Bookings</h1>
            <p className="text-muted-foreground">
            View and manage all your customer appointments.
            </p>
        </div>
         <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Booking
        </Button>
      </header>
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <Card>
                <CardContent className="p-0">
                <Tabs defaultValue="upcoming">
                    <div className="p-4 border-b">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                            <TabsTrigger value="completed">Completed</TabsTrigger>
                            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                            <TabsTrigger value="all">All</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="upcoming" className="p-1 sm:p-4">
                        <BookingsTable bookings={upcoming} onRowClick={handleRowClick} onDeleteClick={handleDeleteClick} />
                    </TabsContent>
                    <TabsContent value="in-progress" className="p-1 sm:p-4">
                        <BookingsTable bookings={inProgress} onRowClick={handleRowClick} onDeleteClick={handleDeleteClick} />
                    </TabsContent>
                    <TabsContent value="completed" className="p-1 sm:p-4">
                        <BookingsTable bookings={completed} onRowClick={handleRowClick} onDeleteClick={handleDeleteClick}/>
                    </TabsContent>
                    <TabsContent value="cancelled" className="p-1 sm:p-4">
                        <BookingsTable bookings={cancelled} onRowClick={handleRowClick} onDeleteClick={handleDeleteClick}/>
                    </TabsContent>
                    <TabsContent value="all" className="p-1 sm:p-4">
                        <BookingsTable bookings={all} onRowClick={handleRowClick} onDeleteClick={handleDeleteClick}/>
                    </TabsContent>
                </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) setSelectedBooking(null); setIsFormOpen(open);}}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedBooking ? 'Edit Booking' : 'Create New Booking'}</DialogTitle>
                        <DialogDescription>
                            {selectedBooking ? `Details for ${selectedBooking.customerName} on ${format(new Date(selectedBooking.date), "PPP")}` : 'Fill out the details for the new booking.'}
                        </DialogDescription>
                    </DialogHeader>
                    <BookingForm booking={selectedBooking} onSave={handleSaveBooking} onCancel={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the booking for <span className="font-bold">{selectedBooking?.customerName}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
