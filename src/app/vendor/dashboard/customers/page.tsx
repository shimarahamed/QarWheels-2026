'use client';
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  import { MoreHorizontal, Car, Calendar, Edit, Mail, Phone } from "lucide-react";
  import { mockVendorCustomers, VendorCustomer } from "@/lib/vendor-data";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { format } from "date-fns";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { useToast } from "@/hooks/use-toast";


function EditCustomerForm({ customer, onFormSubmit, onCancel }: { customer: VendorCustomer, onFormSubmit: () => void, onCancel: () => void }) {
    const { register, handleSubmit, formState: { errors } } = useForm<VendorCustomer>({
        defaultValues: customer,
    });
    const { toast } = useToast();

    const onSubmit = (data: VendorCustomer) => {
        console.log("Updated customer data:", data); // API call
        toast({
            title: "Customer Updated",
            description: `${data.name}'s profile has been successfully updated.`,
        });
        onFormSubmit();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input id="name" {...register("name", { required: "Name is required" })} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" {...register("phone", { required: "Phone is required" })} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email", { required: "Email is required" })} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
            </div>
             <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
    );
}

function CustomerProfileDialog({ customer, open, onOpenChange }: { customer: VendorCustomer | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    if (!customer) return null;

    const handleFormSubmit = () => {
        setIsEditing(false);
        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsEditing(false); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        Customer Profile
                        {!isEditing && <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    </DialogTitle>
                    <DialogDescription>
                        Details for {customer.name}.
                    </DialogDescription>
                </DialogHeader>
                {isEditing ? (
                    <EditCustomerForm customer={customer} onFormSubmit={handleFormSubmit} onCancel={() => setIsEditing(false)}/>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-4">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.email}</span>
                        </div>
                        <div className="border-t my-4" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" /> Vehicles</p>
                                <p className="font-semibold">{customer.vehicleCount}</p>
                            </div>
                             <div>
                                <p className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> First Visit</p>
                                <p className="font-semibold">{format(new Date(customer.firstVisit), "PPP")}</p>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function VendorCustomersPage() {
    const [customers, setCustomers] = useState(mockVendorCustomers);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<VendorCustomer | null>(null);

    const handleViewClick = (customer: VendorCustomer) => {
        setSelectedCustomer(customer);
        setIsViewOpen(true);
    };

    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Customer Directory</h1>
          <p className="text-muted-foreground">
            View information about your clients.
          </p>
        </header>
        <Card>
            <CardHeader>
                <CardTitle>Your Customers</CardTitle>
                <CardDescription>A list of clients who have visited Precision Auto Qatar.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>First Visit</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                        <div>{customer.phone}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell>{format(new Date(customer.firstVisit), "PPP")}</TableCell>
                    <TableCell>{customer.vehicleCount}</TableCell>
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
                              <DropdownMenuItem onSelect={() => handleViewClick(customer)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>View Booking History</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CustomerProfileDialog customer={selectedCustomer} open={isViewOpen} onOpenChange={setIsViewOpen} />
      </div>
    );
  }
