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
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function getStatusVariant(status: VendorBooking['status']) {
    switch (status) {
        case 'Upcoming': return 'default';
        case 'Completed': return 'secondary';
        case 'In Progress': return 'outline';
        case 'Cancelled': return 'destructive';
        default: return 'default';
    }
}


function BookingsTable({ bookings }: { bookings: VendorBooking[] }) {
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
                <TableRow key={booking.id}>
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
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                                <DropdownMenuItem>Cancel</DropdownMenuItem>
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
    const upcoming = mockVendorBookings.filter(b => b.status === "Upcoming");
    const inProgress = mockVendorBookings.filter(b => b.status === "In Progress");
    const completed = mockVendorBookings.filter(b => b.status === "Completed");
    const cancelled = mockVendorBookings.filter(b => b.status === "Cancelled");
    const all = mockVendorBookings;


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
                <BookingsTable bookings={upcoming} />
            </TabsContent>
            <TabsContent value="in-progress" className="p-4">
                <BookingsTable bookings={inProgress} />
            </TabsContent>
            <TabsContent value="completed" className="p-4">
                <BookingsTable bookings={completed} />
            </TabsContent>
            <TabsContent value="cancelled" className="p-4">
                <BookingsTable bookings={cancelled} />
            </TabsContent>
            <TabsContent value="all" className="p-4">
                <BookingsTable bookings={all} />
            </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
