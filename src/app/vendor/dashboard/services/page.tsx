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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { Service, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";


const serviceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    duration: z.coerce.number().int("Must be a whole number").min(1, "Duration must be positive"),
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
  const { business, activeBranch } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<WithId<Service> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const servicesQuery = useMemoFirebase(
    () => activeBranch ? query(collection(firestore, 'branch_services'), where('branchId', '==', activeBranch.id)) : null,
    [firestore, activeBranch],
  );
  const { data: services, isLoading } = useCollection<WithId<Service>>(servicesQuery);

  const handleRowClick = (service: WithId<Service>) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };
  
  const handleAddNewClick = () => {
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (service: WithId<Service>) => {
    setSelectedService(service);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveService = async (data: z.infer<typeof serviceSchema>) => {
    if (!activeBranch) return;
    setIsSubmitting(true);
    try {
      if (selectedService) {
        const serviceDocRef = doc(firestore, 'branch_services', selectedService.id);
        await safeUpdateDoc(serviceDocRef, data);
        toast({ title: "Service Updated", description: `"${data.name}" has been updated.` });
      } else {
        await safeAddDoc(collection(firestore, 'branch_services'), {
          ...data,
          businessId: business.id,
          branchId: activeBranch.id,
          active: true,
        });
        toast({ title: "Service Added", description: `"${data.name}" has been added.` });
      }
      setIsFormOpen(false);
      setSelectedService(null);
    } catch {
      toast({ title: "Error", description: "Could not save service. Check your input and try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedService) return;
    const serviceDocRef = doc(firestore, 'branch_services', selectedService.id);
    await safeDeleteDoc(serviceDocRef);
    toast({
        title: "Service Deleted",
        description: `The service "${selectedService.name}" has been deleted.`,
        variant: "destructive"
    });
    setIsDeleteConfirmOpen(false);
    setSelectedService(null);
  }
  
  const totalServices = services?.length ?? 0;
  const avgPrice = totalServices > 0 ? (services!.reduce((sum, s) => sum + Number(s.price || 0), 0) / totalServices) : 0;
  const avgDuration = totalServices > 0 ? Math.round(services!.reduce((sum, s) => sum + Number(s.duration || 0), 0) / totalServices) : 0;

  const visibleServices = (services ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <PageHeader
        eyebrow="Service catalog"
        icon={<MaterialIcon name="auto_awesome" className="text-sm" />}
        title="Build a clear, bookable service menu."
        description="Keep pricing, duration, and descriptions polished so customers know exactly what they are booking."
        action={
          <Button onClick={handleAddNewClick} className="justify-start shadow-[0_4px_20px_-4px_rgba(227,30,36,0.35)]">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Service
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Active services"
          value={isLoading ? '—' : totalServices}
          icon={<MaterialIcon name="build" className="text-base" />}
        />
        <StatCard
          label="Avg. price"
          value={isLoading ? '—' : `QAR ${avgPrice.toFixed(2)}`}
          icon={<MaterialIcon name="sell" className="text-base" />}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Avg. duration"
          value={isLoading ? '—' : `${avgDuration} min`}
          icon={<MaterialIcon name="timer" className="text-base" />}
          accent="bg-violet-500/10 text-violet-600"
        />
      </StatCardGrid>

      <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Rate Table</CardTitle>
                <CardDescription>A list of services provided by {business.displayName}.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <MaterialIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or category…"
                  className="pl-9"
                />
              </div>
          </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
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
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && services && visibleServices.map((service) => (
                <TableRow key={service.id} onClick={() => handleRowClick(service)} className="cursor-pointer">
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {service.category ? (
                      <Badge variant="outline" className="text-[11px]">{service.category}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell kpi-number">{service.duration}</TableCell>
                  <TableCell className="hidden md:table-cell text-right kpi-number">{Number(service.price).toFixed(2)}</TableCell>
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
           {!isLoading && services && services.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="build" className="text-3xl" />}
                title="No services yet"
                description="Add your first service so customers have something to book."
                action={
                  <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button>
                }
              />
            )}
            {!isLoading && services && services.length > 0 && visibleServices.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="search" className="text-3xl" />}
                title="No services match your search"
                description="Try a different name or category."
              />
            )}
        </CardContent>
        {!isLoading && services && services.length > 0 && (
          <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
            <span>Showing {visibleServices.length} of {services.length} services</span>
          </div>
        )}
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
