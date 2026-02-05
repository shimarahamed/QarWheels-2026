'use client';

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { mockVendorServices, VendorService } from "@/lib/vendor-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// The form component
function EditServiceForm({ service, onFormSubmit }: { service: VendorService, onFormSubmit: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorService>({
    defaultValues: service,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (service) {
      reset(service);
    }
  }, [service, reset]);

  const onSubmit = (data: VendorService) => {
    console.log("Updated service data:", data); // In a real app, you'd call an API here
    toast({
      title: "Service Updated",
      description: `"${data.name}" has been successfully updated.`,
    });
    onFormSubmit();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input id="name" {...register("name", { required: "Name is required" })} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (mins)</Label>
          <Input id="duration" type="number" {...register("duration", { required: "Duration is required", valueAsNumber: true })} />
          {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price (QAR)</Label>
          <Input id="price" type="number" step="0.01" {...register("price", { required: "Price is required", valueAsNumber: true })} />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorServicesPage() {
  const [services, setServices] = useState(mockVendorServices);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);

  const handleEditClick = (service: VendorService) => {
    setSelectedService(service);
    setIsEditDialogOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
      setIsEditDialogOpen(isOpen);
      if (!isOpen) {
          setSelectedService(null);
      }
  }
  
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Services</h1>
          <p className="text-muted-foreground">
            Add, edit, and view the services your garage offers.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Service
        </Button>
      </header>
      <Card>
          <CardHeader>
              <CardTitle>Your Services</CardTitle>
              <CardDescription>A list of services provided by Precision Auto Qatar.</CardDescription>
          </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Duration (mins)</TableHead>
                <TableHead className="text-right">Price (QAR)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.duration}</TableCell>
                  <TableCell className="text-right">{service.price.toFixed(2)}</TableCell>
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
                            <DropdownMenuItem onSelect={() => handleEditClick(service)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedService && (
        <Dialog open={isEditDialogOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Service</DialogTitle>
                    <DialogDescription>
                        Make changes to the service details below. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <EditServiceForm service={selectedService} onFormSubmit={() => handleOpenChange(false)} />
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
  
