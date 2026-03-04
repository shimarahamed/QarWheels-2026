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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Service, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';


const serviceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    duration: z.coerce.number().min(1, "Duration must be positive"),
    price: z.coerce.number().min(0, "Price must be positive"),
});

function ServiceForm({ service, onSave, onCancel, isSubmitting }: { service?: WithId<Service> | null, onSave: (data: z.infer<typeof serviceSchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service || { name: '', description: '', price: 0, duration: 0 },
  });

  useEffect(() => {
      reset(service || {name: '', description: '', price: 0, duration: 0});
  }, [service, reset]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (mins)</Label>
          <Input id="duration" type="number" {...register("duration")} />
          {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price (QAR)</Label>
          <Input id="price" type="number" step="0.01" {...register("price")} />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
      </div>
      <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Save Service
          </Button>
      </DialogFooter>
    </form>
  );
}


export default function VendorServicesPage() {
  const { firestore } = useFirebase();
  const { vendor } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<WithId<Service> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const servicesRef = useMemoFirebase(() => vendor ? collection(firestore, 'vendors', vendor.id, 'services') : null, [firestore, vendor]);
  const { data: services, isLoading } = useCollection<WithId<Service>>(servicesRef);

  const handleRowClick = (service: WithId<Service>) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };
  
  const handleAddNewClick = () => {
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, service: WithId<Service>) => {
    e.stopPropagation();
    setSelectedService(service);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveService = (data: z.infer<typeof serviceSchema>) => {
    if (!vendor || !servicesRef) return;
    setIsSubmitting(true);

    if (selectedService) {
        // Update
        const serviceDocRef = doc(firestore, 'vendors', vendor.id, 'services', selectedService.id);
        safeUpdateDoc(serviceDocRef, data);
        toast({ title: "Service Updated", description: `"${data.name}" has been updated.` });
    } else {
        // Create
        safeAddDoc(servicesRef, data);
        toast({ title: "Service Added", description: `"${data.name}" has been added.` });
    }
    setIsSubmitting(false);
    setIsFormOpen(false);
    setSelectedService(null);
  }
  
  const handleDeleteConfirm = () => {
    if (!selectedService || !vendor) return;
    const serviceDocRef = doc(firestore, 'vendors', vendor.id, 'services', selectedService.id);
    safeDeleteDoc(serviceDocRef);
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
              <CardDescription>A list of services provided by {vendor?.name}.</CardDescription>
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
              {isLoading && [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && services && services.map((service) => (
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
                            <DropdownMenuItem onSelect={(e) => handleDeleteClick(e, service)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {!isLoading && (!services || services.length === 0) && (
              <div className="text-center text-muted-foreground p-8">
                <Wrench className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                <p>You haven't added any services yet.</p>
              </div>
            )}
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
                <ServiceForm service={selectedService} onSave={handleSaveService} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} />
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
