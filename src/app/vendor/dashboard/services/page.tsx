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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from "lucide-react";
import { mockVendorServices, VendorService } from "@/lib/vendor-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";


function ServiceForm({ service, onSave, onCancel }: { service?: VendorService | null, onSave: (data: VendorService) => void, onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorService>({
    defaultValues: service || {},
  });

  useEffect(() => {
      reset(service || {name: '', description: '', price: 0, duration: 0});
  }, [service, reset]);

  const onSubmit = (data: VendorService) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input id="name" {...register("name", { required: "Name is required" })} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description", { required: "Description is required" })} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
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
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Service</Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorServicesPage() {
  const [services, setServices] = useState(mockVendorServices);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<VendorService | null>(null);
  const { toast } = useToast();

  const handleRowClick = (service: VendorService) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };
  
  const handleAddNewClick = () => {
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (service: VendorService) => {
    setSelectedService(service);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveService = (data: VendorService) => {
    if (selectedService && selectedService.id) {
        // Update
        setServices(prev => prev.map(s => s.id === selectedService.id ? {...data, id: selectedService.id} : s));
        toast({ title: "Service Updated", description: `"${data.name}" has been updated.` });
    } else {
        // Create
        const newService = { ...data, id: `vs-${Date.now()}` };
        setServices(prev => [newService, ...prev]);
        toast({ title: "Service Added", description: `"${data.name}" has been added.` });
    }
    setIsFormOpen(false);
    setSelectedService(null);
  }
  
  const handleDeleteConfirm = () => {
    if (!selectedService) return;
    setServices(prev => prev.filter(s => s.id !== selectedService.id));
    toast({
        title: "Service Deleted",
        description: `The service "${selectedService.name}" has been deleted.`,
        variant: "destructive"
    });
    setIsDeleteConfirmOpen(false);
    setSelectedService(null);
  }
  
  return (
    <div className="space-y-8">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Services</h1>
          <p className="text-muted-foreground">
            Add, edit, and view the services your garage offers.
          </p>
        </div>
        <Button onClick={handleAddNewClick}>
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
                <TableHead className="hidden sm:table-cell">Duration (mins)</TableHead>
                <TableHead className="hidden md:table-cell text-right">Price (QAR)</TableHead>
                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id} onClick={() => handleRowClick(service)} className="cursor-pointer">
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{service.duration}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">{service.price.toFixed(2)}</TableCell>
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
                            <DropdownMenuItem onSelect={() => handleRowClick(service)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleDeleteClick(service)} className="text-destructive focus:text-destructive">
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

        <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setSelectedService(null); setIsFormOpen(open)}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{selectedService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                    <DialogDescription>
                       {selectedService ? 'Make changes to the service details below.' : 'Fill in the details for the new service.'}
                    </DialogDescription>
                </DialogHeader>
                <ServiceForm service={selectedService} onSave={handleSaveService} onCancel={() => setIsFormOpen(false)} />
            </DialogContent>
        </Dialog>
      
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the <span className="font-bold">{selectedService?.name}</span> service.
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
  