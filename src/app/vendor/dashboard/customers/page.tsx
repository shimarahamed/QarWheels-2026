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
  import { MoreHorizontal, Car, Calendar, Edit, Mail, Phone, PlusCircle, Trash2 } from "lucide-react";
  import { mockVendorCustomers, VendorCustomer } from "@/lib/vendor-data";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
    import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { useToast } from "@/hooks/use-toast";


function CustomerForm({ customer, onSave, onCancel }: { customer?: VendorCustomer | null, onSave: (data: VendorCustomer) => void, onCancel: () => void }) {
    const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorCustomer>({
        defaultValues: customer || {},
    });

    useState(() => {
        if (customer) {
            reset(customer);
        }
    }, [customer, reset]);

    const onSubmit = (data: VendorCustomer) => {
        onSave(data);
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
             <div className="space-y-2">
                <Label htmlFor="vehicleCount">Vehicle Count</Label>
                <Input id="vehicleCount" type="number" {...register("vehicleCount", { required: "Vehicle count is required", valueAsNumber: true })} />
                {errors.vehicleCount && <p className="text-sm text-destructive">{errors.vehicleCount.message}</p>}
            </div>
             <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Customer</Button>
            </div>
        </form>
    );
}

export default function VendorCustomersPage() {
    const [customers, setCustomers] = useState(mockVendorCustomers);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<VendorCustomer | null>(null);
    const { toast } = useToast();


    const handleRowClick = (customer: VendorCustomer) => {
        setSelectedCustomer(customer);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedCustomer(null);
        setIsFormOpen(true);
    };
    
    const handleDeleteClick = (customer: VendorCustomer) => {
        setSelectedCustomer(customer);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveCustomer = (data: VendorCustomer) => {
      let message = "";
      if (selectedCustomer && selectedCustomer.id) {
        // Update
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {...data, id: selectedCustomer.id, firstVisit: selectedCustomer.firstVisit} : c));
        message = `${data.name}'s profile has been updated.`;
      } else {
        // Create
        const newCustomer = { ...data, id: `vc-${Date.now()}`, firstVisit: new Date().toISOString() };
        setCustomers(prev => [newCustomer, ...prev]);
        message = `${data.name} has been added as a new customer.`;
      }
      
      toast({
            title: selectedCustomer ? "Customer Updated" : "Customer Added",
            description: message,
      });

      setIsFormOpen(false);
      setSelectedCustomer(null);
    }

    const handleDeleteConfirm = () => {
        if (!selectedCustomer) return;
        setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
        toast({
            title: "Customer Deleted",
            description: `The profile for ${selectedCustomer.name} has been deleted.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedCustomer(null);
    }

    return (
      <div className="space-y-8">
        <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Customer Directory</h1>
            <p className="text-muted-foreground">
                View, add, and manage your client information.
            </p>
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Customer
          </Button>
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
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">First Visit</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} onClick={() => handleRowClick(customer)} className="cursor-pointer">
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div>{customer.phone}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(customer.firstVisit), "PPP")}</TableCell>
                    <TableCell>{customer.vehicleCount}</TableCell>
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
                              <DropdownMenuItem onSelect={() => handleRowClick(customer)}>
                                <Edit className="mr-2 h-4 w-4" /> View & Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Booking History</DropdownMenuItem>
                               <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDeleteClick(customer)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={(open) => { if(!open) setSelectedCustomer(null); setIsFormOpen(open)}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{selectedCustomer ? 'Edit Customer Profile' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>
                       {selectedCustomer ? `Editing details for ${selectedCustomer.name}` : 'Enter the details for the new customer.'}
                    </DialogDescription>
                </DialogHeader>
                <CustomerForm customer={selectedCustomer} onSave={handleSaveCustomer} onCancel={() => setIsFormOpen(false)} />
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the profile for <span className="font-bold">{selectedCustomer?.name}</span>.
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
