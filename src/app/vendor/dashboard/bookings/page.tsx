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
import { MoreHorizontal, Edit, Phone, Car, Calendar, CircleDollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
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


function BookingsTable({ bookings, onRowClick }: { bookings: VendorBooking[], onRowClick: (booking: VendorBooking) => void }) {
    return (
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                <span className="sr-only">Actions</span>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {bookings.map((booking) => (
                <TableRow key={booking.id} onClick={() => onRowClick(booking)} className="cursor-pointer">
                    <TableCell>
                        <div className="font-medium">{booking.customerName}</div>
                        <div className="text-sm text-muted-foreground">{booking.carModel}</div>
                    </TableCell>
                    <TableCell>{booking.service}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        {format(new Date(booking.date), "PPP p")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">QAR {booking.cost.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => onRowClick(booking)}>View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
      </Table>
    )
}

function EditBookingForm({ booking, onSave, onCancel }: { booking: VendorBooking, onSave: (data: VendorBooking) => void, onCancel: () => void }) {
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<VendorBooking>({
        defaultValues: booking,
    });
    const { toast } = useToast();

    useEffect(() => {
        reset(booking);
    }, [booking, reset]);

    const onSubmit = (data: VendorBooking) => {
        console.log("Updated booking data:", data);
        toast({
            title: "Booking Updated",
            description: `Booking for ${data.customerName} has been updated.`,
        });
        onSave(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
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


function BookingDetailsDialog({ booking, open, onOpenChange, onBookingUpdate }: { booking: VendorBooking | null, open: boolean, onOpenChange: (open: boolean) => void, onBookingUpdate: (data: VendorBooking) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    if (!booking) return null;

    const handleFormSave = (data: VendorBooking) => {
        onBookingUpdate(data);
        setIsEditing(false);
    }

    const closeDialog = (isOpen: boolean) => {
        onOpenChange(isOpen);
        if (!isOpen) setIsEditing(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Booking Details
                        {!isEditing && <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    </DialogTitle>
                    <DialogDescription>
                        For {booking.customerName} on {format(new Date(booking.date), "PPP")}
                    </DialogDescription>
                </DialogHeader>
                {isEditing ? (
                    <EditBookingForm booking={booking} onSave={handleFormSave} onCancel={() => setIsEditing(false)} />
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="p-4 rounded-lg bg-muted grid gap-4">
                            <p className="font-semibold text-lg">{booking.service}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between font-semibold">
                                <span className="text-muted-foreground">Cost</span>
                                <span>QAR {booking.cost.toFixed(2)}</span>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Car className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{booking.carModel}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{booking.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(booking.date), "PPP, p")}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function VendorBookingsPage() {
    const [bookings, setBookings] = useState(mockVendorBookings);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<VendorBooking | null>(null);

    const handleRowClick = (booking: VendorBooking) => {
        setSelectedBooking(booking);
        setIsDialogOpen(true);
    };

    const handleBookingUpdate = (updatedBooking: VendorBooking) => {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        setIsDialogOpen(false);
    };

    const upcoming = bookings.filter(b => b.status === "Upcoming");
    const inProgress = bookings.filter(b => b.status === "In Progress");
    const completed = bookings.filter(b => b.status === "Completed");
    const cancelled = bookings.filter(b => b.status === "Cancelled");
    const all = bookings;

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
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="upcoming" className="p-4">
                <BookingsTable bookings={upcoming} onRowClick={handleRowClick} />
            </TabsContent>
            <TabsContent value="in-progress" className="p-4">
                <BookingsTable bookings={inProgress} onRowClick={handleRowClick} />
            </TabsContent>
            <TabsContent value="completed" className="p-4">
                <BookingsTable bookings={completed} onRowClick={handleRowClick} />
            </TabsContent>
            <TabsContent value="cancelled" className="p-4">
                <BookingsTable bookings={cancelled} onRowClick={handleRowClick} />
            </TabsContent>
            <TabsContent value="all" className="p-4">
                <BookingsTable bookings={all} onRowClick={handleRowClick} />
            </TabsContent>
        </Tabs>
        </CardContent>
      </Card>

      <BookingDetailsDialog 
        booking={selectedBooking} 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onBookingUpdate={handleBookingUpdate}
      />
    </div>
  );
}
