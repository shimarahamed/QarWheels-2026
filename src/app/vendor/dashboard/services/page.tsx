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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Download } from "lucide-react";
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
import { downloadVendorCsv } from "@/lib/vendor-export";
import { filterVendorServices } from "@/lib/vendor-catalog";


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
  const { business, activeBranch, canAccess } = useVendor();
  const canWrite = canAccess('services', 'write');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<WithId<Service> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  useEffect(() => { setCategory(''); }, [activeBranch?.id]);

  const servicesQuery = useMemoFirebase(
    () => activeBranch && business ? query(collection(firestore, 'branch_services'), where('businessId', '==', business.id), where('branchId', '==', activeBranch.id)) : null,
    [firestore, activeBranch, business],
  );
  const { data: services, isLoading, error } = useCollection<WithId<Service>>(servicesQuery);

  const handleRowClick = (service: WithId<Service>) => {
    if (!canWrite) return;
    setSelectedService(service);
    setIsFormOpen(true);
  };
  
  const handleAddNewClick = () => {
    if (!canWrite || !activeBranch) return;
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (service: WithId<Service>) => {
    setSelectedService(service);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveService = async (data: z.infer<typeof serviceSchema>) => {
    if (!activeBranch || !canWrite) return;
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
    if (!selectedService || !canWrite) return;
    setIsSubmitting(true);
    try {
      await safeDeleteDoc(doc(firestore, 'branch_services', selectedService.id));
      toast({ title: 'Service Deleted', description: `"${selectedService.name}" has been deleted.` });
      setIsDeleteConfirmOpen(false);
      setSelectedService(null);
    } catch {
      toast({ title: 'Could not delete service', description: 'The service has not been removed. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalServices = services?.length ?? 0;
  const avgPrice = totalServices > 0 ? (services!.reduce((sum, s) => sum + Number(s.price || 0), 0) / totalServices) : 0;
  const avgDuration = totalServices > 0 ? Math.round(services!.reduce((sum, s) => sum + Number(s.duration || 0), 0) / totalServices) : 0;

  const activeServices = (services ?? []).filter((service) => service.active).length;
  const categories = [...new Set((services ?? []).map((service) => service.category).filter((value): value is string => !!value))].sort();
  const visibleServices = filterVendorServices(services ?? [], search, category);
  const unavailable = isLoading || !!error || !activeBranch;
  const exportRates = () => downloadVendorCsv('qarwheel-service-rates.csv',
    ['Service', 'Description', 'Category', 'Duration (minutes)', 'Price (QAR)', 'Active'],
    visibleServices.map((service) => [service.name, service.description, service.category ?? '', service.duration, service.price, service.active ? 'Yes' : 'No']));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <PageHeader
        eyebrow="Workshop operations / Services & rates"
        icon={<MaterialIcon name="tune" className="text-sm" />}
        title="Service Catalog & Rates"
        description="Manage service procedures, durations and customer pricing for the selected branch."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={unavailable || visibleServices.length === 0} onClick={exportRates}>
              <Download className="mr-2 h-4 w-4" /> Export Rate Matrix (CSV)
            </Button>
            {canWrite && <Button onClick={handleAddNewClick} disabled={!activeBranch}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
            </Button>}
          </div>
        }
      />

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Services could not be loaded. Check your connection and reload this page.</div>}
      {!activeBranch && <p role="status" className="text-sm text-muted-foreground">Select a branch to view its services.</p>}
      <StatCardGrid>
        <StatCard
          label="Catalog services"
          value={unavailable ? '—' : totalServices}
          icon={<MaterialIcon name="build" className="text-base" />}
        />
        <StatCard
          label="Avg. price"
          value={unavailable ? '—' : `QAR ${avgPrice.toFixed(2)}`}
          icon={<MaterialIcon name="sell" className="text-base" />}
          accent="bg-muted vendor-gold"
        />
        <StatCard
          label="Avg. duration"
          value={unavailable ? '—' : `${avgDuration} min`}
          icon={<MaterialIcon name="timer" className="text-base" />}
          accent="bg-violet-500/10 text-violet-600"
        />
        <StatCard label="Active services" value={unavailable ? '--' : activeServices}
          icon={<MaterialIcon name="check_circle" className="text-base" />}
          hint="Available in the catalog" />
      </StatCardGrid>

      <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Service Pricing Matrix</CardTitle>
                <CardDescription>A list of services provided by {business.displayName}.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <MaterialIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                <Input
                  aria-label="Search services"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name or category…"
                  className="pl-9"
                />
              </div>
          </CardHeader>
        <CardContent>
          {categories.length > 0 && <div aria-label="Filter services by category" className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" variant={category === '' ? 'default' : 'outline'} aria-pressed={category === ''} onClick={() => setCategory('')}>All services</Button>
            {categories.map((value) => <Button key={value} size="sm" variant={category === value ? 'default' : 'outline'} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</Button>)}
          </div>}
          <Table>
            <TableHeader className="bg-muted/60 text-[10px] uppercase tracking-wider">
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Duration (mins)</TableHead>
                <TableHead className="text-right">Price (QAR)</TableHead>
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
                    <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
              {!unavailable && services && visibleServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="max-w-[320px] whitespace-normal">
                    {canWrite ? <button type="button" className="text-left font-semibold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => handleRowClick(service)}>{service.name}</button> : <span className="font-semibold">{service.name}</span>}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:hidden">{service.duration} min</p>
                    {!service.active && <Badge variant="outline" className="mt-2 text-[10px]">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {service.category ? (
                      <Badge variant="outline" className="text-[11px]">{service.category}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell kpi-number">{service.duration}</TableCell>
                  <TableCell className="text-right kpi-number">{Number(service.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {canWrite && <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions for {service.name}</span>
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
                    </DropdownMenu>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {!unavailable && services && services.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="build" className="text-3xl" />}
                title="No services yet"
                description="Add your first service so customers have something to book."
                action={
                  canWrite ? <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button> : undefined
                }
              />
            )}
            {!unavailable && services && services.length > 0 && visibleServices.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="search" className="text-3xl" />}
                title="No services match your filters"
                description="Try another search or category."
              />
            )}
        </CardContent>
        {!unavailable && services && services.length > 0 && (
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
                <AlertDialogAction disabled={isSubmitting} onClick={(event) => { event.preventDefault(); void handleDeleteConfirm(); }}>{isSubmitting ? 'Deleting...' : 'Delete service'}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
