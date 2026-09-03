'use client';

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Percent, Calendar, CalendarX, Trash2, Edit, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { Promotion, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const promotionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  code: z.string().min(1, "Promo code is required"),
  discount: z.string().min(1, "Discount is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["Active", "Expired", "Scheduled"]),
});

function PromotionForm({ promotion, onSave, onCancel, isSubmitting }: { promotion?: WithId<Promotion> | null, onSave: (data: z.infer<typeof promotionSchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<z.infer<typeof promotionSchema>>({
      resolver: zodResolver(promotionSchema),
      defaultValues: promotion ? {
        ...promotion,
        startDate: format(parseISO(promotion.startDate), 'yyyy-MM-dd'),
        endDate: format(parseISO(promotion.endDate), 'yyyy-MM-dd'),
      } : { status: 'Scheduled' },
  });
  
  useEffect(() => {
    reset(promotion ? {
        ...promotion,
        startDate: format(parseISO(promotion.startDate), 'yyyy-MM-dd'),
        endDate: format(parseISO(promotion.endDate), 'yyyy-MM-dd'),
      } : { 
        title: '', description: '', code: '', discount: '', 
        startDate: '', endDate: '', status: 'Scheduled' 
    });
  }, [promotion, reset]);

  const onSubmit = (data: z.infer<typeof promotionSchema>) => {
    onSave({
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="code">Promo Code</Label>
            <Input id="code" {...register("code")} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input id="discount" {...register("discount")} placeholder="e.g. 20% or QAR 50" />
            {errors.discount && <p className="text-sm text-destructive">{errors.discount.message}</p>}
        </div>
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" {...register("endDate")}/>
            {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
         <Controller
            control={control}
            name="status"
            render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                </Select>
            )}
        />
      </div>
      <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Save Promotion
        </Button>
      </DialogFooter>
    </form>
  );
}

function getStatus(promo: Promotion) {
    const now = new Date();
    const start = parseISO(promo.startDate);
    const end = parseISO(promo.endDate);
    end.setHours(23, 59, 59, 999); // End of day

    if (now > end) return 'Expired';
    if (now >= start && now <= end) return 'Active';
    return 'Scheduled';
}

function getStatusVariant(status: string) {
    switch(status) {
        case 'Active': return 'default';
        case 'Expired': return 'secondary';
        case 'Scheduled': return 'outline';
        default: return 'default';
    }
}
  
export default function VendorPromotionsPage() {
    const { firestore } = useFirebase();
    const { business, activeBranch } = useVendor();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<WithId<Promotion> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const promotionsQuery = useMemoFirebase(
      () => activeBranch ? query(collection(firestore, 'branch_promotions'), where('branchIds', 'array-contains', activeBranch.id)) : null,
      [firestore, activeBranch],
    );
    const { data: promotions, isLoading } = useCollection<WithId<Promotion>>(promotionsQuery);

    // Counts use the same derived status the cards show, so the tiles and the
    // grid can never disagree.
    const statusCounts = (promotions ?? []).reduce(
        (acc, promo) => {
            acc[getStatus(promo)] += 1;
            return acc;
        },
        { Active: 0, Scheduled: 0, Expired: 0 } as Record<'Active' | 'Scheduled' | 'Expired', number>,
    );

    const handleEditClick = (promotion: WithId<Promotion>) => {
        setSelectedPromotion(promotion);
        setIsFormOpen(true);
    };
    
    const handleAddNewClick = () => {
        setSelectedPromotion(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (promotion: WithId<Promotion>) => {
        setSelectedPromotion(promotion);
        setIsDeleteConfirmOpen(true);
    };

    const handleSavePromotion = (data: z.infer<typeof promotionSchema>) => {
        if (!activeBranch) return;
        setIsSubmitting(true);
        if (selectedPromotion) {
            // Update
            const promoDocRef = doc(firestore, 'branch_promotions', selectedPromotion.id);
            safeUpdateDoc(promoDocRef, data);
            toast({ title: "Promotion Updated", description: `"${data.title}" has been updated.`});
        } else {
            // Create
            safeAddDoc(collection(firestore, 'branch_promotions'), {
                ...data,
                businessId: business.id,
                branchIds: [activeBranch.id],
            });
            toast({ title: "Promotion Created", description: `"${data.title}" has been created.` });
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
        setSelectedPromotion(null);
    };

    const handleDeleteConfirm = () => {
        if (!selectedPromotion) return;
        const promoDocRef = doc(firestore, 'branch_promotions', selectedPromotion.id);
        safeDeleteDoc(promoDocRef);
        toast({
            title: "Promotion Deleted",
            description: `The promotion "${selectedPromotion.title}" has been deleted.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedPromotion(null);
    }

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Marketing"
          icon={<Percent className="h-3.5 w-3.5" />}
          title="Run offers that bring customers back."
          description="Create and manage discount codes, seasonal offers, and scheduled campaigns for this branch."
          action={
            <Button onClick={handleAddNewClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Promotion
            </Button>
          }
        />

        <StatCardGrid>
          <StatCard
            label="Active"
            value={isLoading ? '—' : statusCounts.Active}
            icon={<Percent className="h-4 w-4" />}
            accent="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            label="Scheduled"
            value={isLoading ? '—' : statusCounts.Scheduled}
            icon={<Calendar className="h-4 w-4" />}
            accent="bg-amber-500/10 text-amber-600"
          />
          <StatCard
            label="Expired"
            value={isLoading ? '—' : statusCounts.Expired}
            icon={<CalendarX className="h-4 w-4" />}
            accent="bg-muted text-muted-foreground"
          />
        </StatCardGrid>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {isLoading && [...Array(3)].map((_, i) => (
                <Card key={i} className="flex flex-col rounded-2xl border bg-card shadow-sm">
                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full mt-2" /></CardHeader>
                    <CardContent className="space-y-4 flex-grow"><Skeleton className="h-12 w-full" /><Skeleton className="h-5 w-1/2" /></CardContent>
                    <CardFooter className="flex gap-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardFooter>
                </Card>
            ))}
            {!isLoading && promotions && promotions.map((promo) => {
                const status = getStatus(promo);
                return (
                    <Card key={promo.id} className="flex flex-col rounded-2xl border bg-card shadow-sm">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{promo.title}</CardTitle>
                                <Badge variant={getStatusVariant(status)}>{status}</Badge>
                            </div>
                            <CardDescription>{promo.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow">
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                                <Percent className="h-5 w-5 text-primary"/>
                                <span className="font-mono text-sm">Code: {promo.code}</span>
                                <span className="ml-auto font-semibold">{promo.discount} OFF</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(parseISO(promo.startDate), 'MMM d, yyyy')} - {format(parseISO(promo.endDate), 'MMM d, yyyy')}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" className="w-full" onClick={() => handleEditClick(promo)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button variant="destructive" className="w-full" onClick={() => handleDeleteClick(promo)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
             {!isLoading && (!promotions || promotions.length === 0) && (
                <div className="md:col-span-2 lg:col-span-3">
                    <EmptyState
                        icon={<Percent className="h-8 w-8" />}
                        title="No promotions yet"
                        description="Create a discount code or seasonal offer to bring customers back for their next service."
                        action={
                          <Button onClick={handleAddNewClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Promotion
                          </Button>
                        }
                    />
                </div>
            )}
        </div>

          <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setSelectedPromotion(null); setIsFormOpen(open);}}>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                      <DialogTitle>{selectedPromotion ? 'Edit Promotion' : 'Create New Promotion'}</DialogTitle>
                      <DialogDescription>
                          {selectedPromotion ? 'Update the details for your promotion.' : 'Fill out the details for the new promotion.'}
                      </DialogDescription>
                  </DialogHeader>
                  <PromotionForm promotion={selectedPromotion} onSave={handleSavePromotion} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} />
              </DialogContent>
          </Dialog>

           <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the <span className="font-bold">{selectedPromotion?.title}</span> promotion.
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
