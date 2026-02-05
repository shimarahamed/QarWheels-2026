'use client';

import { useState } from "react";
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
import { PlusCircle, Percent, Calendar } from "lucide-react";
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
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function EditPromotionForm({ promotion, onFormSubmit }: { promotion: VendorPromotion, onFormSubmit: () => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<VendorPromotion>({
    defaultValues: {
        ...promotion,
        startDate: format(new Date(promotion.startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(promotion.endDate), 'yyyy-MM-dd'),
    }
  });
  const { toast } = useToast();

  const onSubmit = (data: VendorPromotion) => {
    console.log("Updated promotion data:", data); // API call here
    toast({
      title: "Promotion Updated",
      description: `"${data.title}" has been successfully updated.`,
    });
    onFormSubmit();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Input id="discount" {...register("discount", { required: "Discount is required" })} />
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
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}

function getStatusVariant(status: VendorPromotion['status']) {
    switch (status) {
        case 'Active': return 'default';
        case 'Scheduled': return 'outline';
        case 'Expired': return 'secondary';
        default: return 'default';
    }
}
  
export default function VendorPromotionsPage() {
    const [promotions, setPromotions] = useState(mockPromotions);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<VendorPromotion | null>(null);

    const handleEditClick = (promotion: VendorPromotion) => {
        setSelectedPromotion(promotion);
        setIsEditDialogOpen(true);
    };

    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Marketing & Promotions</h1>
            <p className="text-muted-foreground">
              Create and manage discounts and special offers.
            </p>
          </div>
          <Button>
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
                        <Button variant="outline" className="w-full" onClick={() => handleEditClick(promo)}>Edit</Button>
                        <Button variant="destructive" className="w-full">Delete</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>

        {selectedPromotion && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                      <DialogTitle>Edit Promotion</DialogTitle>
                      <DialogDescription>
                          Update the details for your promotion.
                      </DialogDescription>
                  </DialogHeader>
                  <EditPromotionForm promotion={selectedPromotion} onFormSubmit={() => setIsEditDialogOpen(false)} />
              </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }
  
