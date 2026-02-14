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
import { PlusCircle, Percent, Calendar, Trash2, Edit } from "lucide-react";
import { mockPromotions, VendorPromotion } from "@/lib/vendor-data";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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

function PromotionForm({ promotion, onSave, onCancel }: { promotion?: VendorPromotion | null, onSave: (data: VendorPromotion) => void, onCancel: () => void }) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<any>({
      defaultValues: promotion || {status: 'Scheduled'},
  });
  
  useEffect(() => {
    reset({
        ...promotion,
        startDate: promotion?.startDate ? format(new Date(promotion.startDate), 'yyyy-MM-dd') : '',
        endDate: promotion?.endDate ? format(new Date(promotion.endDate), 'yyyy-MM-dd') : '',
    });
  }, [promotion, reset]);

  const onSubmit = (data: any) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title", { required: "Title is required" })} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description", { required: "Description is required" })} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="code">Promo Code</Label>
            <Input id="code" {...register("code", { required: "Code is required" })} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input id="discount" {...register("discount", { required: "Discount is required" })} placeholder="e.g. 20% or QAR 50" />
            {errors.discount && <p className="text-sm text-destructive">{errors.discount.message}</p>}
        </div>
      </div>
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" {...register("startDate", { required: "Start date is required" })} />
            {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" {...register("endDate", { required: "End date is required" })}/>
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
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Promotion</Button>
      </DialogFooter>
    </form>
  );
}

function getStatusVariant(status: VendorPromotion['status']) {
    const now = new Date();
    if (status === 'Active' && new Date(status) > now) return 'default';
    if (status === 'Expired' || new Date(status) < now) return 'secondary';
    if (status === 'Scheduled') return 'outline';
    return 'default';
}
  
export default function VendorPromotionsPage() {
    const [promotions, setPromotions] = useState(mockPromotions);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<VendorPromotion | null>(null);
    const { toast } = useToast();

    const handleEditClick = (promotion: VendorPromotion) => {
        setSelectedPromotion(promotion);
        setIsFormOpen(true);
    };
    
    const handleAddNewClick = () => {
        setSelectedPromotion(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (promotion: VendorPromotion) => {
        setSelectedPromotion(promotion);
        setIsDeleteConfirmOpen(true);
    };

    const handleSavePromotion = (data: VendorPromotion) => {
        let message = "";
        if (selectedPromotion && selectedPromotion.id) {
            // Update
            setPromotions(prev => prev.map(p => p.id === selectedPromotion.id ? { ...data, id: selectedPromotion.id } : p));
            message = `"${data.title}" has been updated.`;
        } else {
            // Create
            const newPromotion = { ...data, id: `promo-${Date.now()}` };
            setPromotions(prev => [newPromotion, ...prev]);
            message = `"${data.title}" has been created.`;
        }
        toast({
            title: selectedPromotion ? "Promotion Updated" : "Promotion Created",
            description: message,
        });
        setIsFormOpen(false);
        setSelectedPromotion(null);
    };

    const handleDeleteConfirm = () => {
        if (!selectedPromotion) return;
        setPromotions(prev => prev.filter(p => p.id !== selectedPromotion.id));
        toast({
            title: "Promotion Deleted",
            description: `The promotion "${selectedPromotion.title}" has been deleted.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedPromotion(null);
    }

    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Marketing & Promotions</h1>
            <p className="text-muted-foreground">
              Create and manage discounts and special offers.
            </p>
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Promotion
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => (
                <Card key={promo.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>{promo.title}</CardTitle>
                            <Badge variant={getStatusVariant(promo.status)}>{promo.status}</Badge>
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
                            <span>{format(new Date(promo.startDate), 'MMM d, yyyy')} - {format(new Date(promo.endDate), 'MMM d, yyyy')}</span>
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
            ))}
        </div>

          <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setSelectedPromotion(null); setIsFormOpen(open);}}>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                      <DialogTitle>{selectedPromotion ? 'Edit Promotion' : 'Create New Promotion'}</DialogTitle>
                      <DialogDescription>
                          {selectedPromotion ? 'Update the details for your promotion.' : 'Fill out the details for the new promotion.'}
                      </DialogDescription>
                  </DialogHeader>
                  <PromotionForm promotion={selectedPromotion} onSave={handleSavePromotion} onCancel={() => setIsFormOpen(false)} />
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
  