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
  import { Boxes, MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Package, Sparkles, TriangleAlert } from "lucide-react";
  import { PageHeader } from "@/components/ui/page-header";
  import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
  import { EmptyState } from "@/components/ui/empty-state";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/components/vendor/vendor-provider";
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { InventoryItem, WithId } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const inventorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  supplier: z.string().min(1, "Supplier is required"),
});


function InventoryForm({ item, onSave, onCancel, isSubmitting }: { item?: WithId<InventoryItem> | null, onSave: (data: z.infer<typeof inventorySchema>) => void, onCancel: () => void, isSubmitting: boolean }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof inventorySchema>>({
    resolver: zodResolver(inventorySchema),
    defaultValues: item || { name: '', sku: '', stock: 0, price: 0, supplier: '' },
  });

  useEffect(() => {
    reset(item || { name: '', sku: '', stock: 0, price: 0, supplier: '' });
  }, [item, reset]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" {...register("sku")} />
        {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register("stock")} />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (QAR)</Label>
            <Input id="price" type="number" step="0.01" {...register("price")} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" {...register("supplier")} />
        {errors.supplier && <p className="text-sm text-destructive">{errors.supplier.message}</p>}
      </div>
      <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          Save Item
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function VendorInventoryPage() {
    const { firestore } = useFirebase();
    const { business, activeBranch } = useVendor();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WithId<InventoryItem> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Must filter on both businessId and branchId — firestore.rules'
    // isInventoryManager() checks both fields, and a `list` rule can only be
    // proven for a query that filters on every field it inspects. A
    // branchId-only query can't prove businessId too (it genuinely varies
    // per matching doc), so Firestore denies the whole list outright.
    const inventoryQuery = useMemoFirebase(
      () => activeBranch
        ? query(
            collection(firestore, 'branch_inventory'),
            where('businessId', '==', business.id),
            where('branchId', '==', activeBranch.id),
          )
        : null,
      [firestore, business, activeBranch],
    );
    const { data: inventory, isLoading } = useCollection<WithId<InventoryItem>>(inventoryQuery);

    const lowStockCount = (inventory ?? []).filter((item) => item.stock < 10).length;
    const stockValue = (inventory ?? []).reduce((sum, item) => sum + (item.price ?? 0) * (item.stock ?? 0), 0);

    const handleRowClick = (item: WithId<InventoryItem>) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (item: WithId<InventoryItem>) => {
        setSelectedItem(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveItem = (data: z.infer<typeof inventorySchema>) => {
        if (!activeBranch) return;
        setIsSubmitting(true);
        if (selectedItem) {
            // Update
            const itemDocRef = doc(firestore, 'branch_inventory', selectedItem.id);
            safeUpdateDoc(itemDocRef, data);
            toast({ title: "Item Updated", description: `"${data.name}" has been updated.`});
        } else {
            // Create
            safeAddDoc(collection(firestore, 'branch_inventory'), {
                ...data,
                businessId: business.id,
                branchId: activeBranch.id,
            });
            toast({ title: "Item Added", description: `"${data.name}" has been added to inventory.` });
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
        setSelectedItem(null);
    }

     const handleDeleteConfirm = () => {
        if (!selectedItem) return;
        const itemDocRef = doc(firestore, 'branch_inventory', selectedItem.id);
        safeDeleteDoc(itemDocRef);
        toast({
            title: "Item Deleted",
            description: `The item "${selectedItem.name}" has been deleted from inventory.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedItem(null);
    }

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
        <PageHeader
          eyebrow="Parts intelligence"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Inventory that feels under control."
          description="Track stock, suppliers, SKU details, and prices with a cleaner operational view."
          action={
            <Button onClick={handleAddNewClick} className="justify-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          }
        />

        <StatCardGrid>
          <StatCard
            label="Stock items"
            value={isLoading ? '—' : inventory?.length ?? 0}
            icon={<Package className="h-4 w-4" />}
          />
          <StatCard
            label="Low stock"
            value={isLoading ? '—' : lowStockCount}
            icon={<TriangleAlert className="h-4 w-4" />}
            accent="bg-destructive/10 text-destructive"
            hint="Fewer than 10 in stock"
          />
          <StatCard
            label="Stock value"
            value={isLoading ? '—' : `QAR ${stockValue.toFixed(2)}`}
            icon={<Boxes className="h-4 w-4" />}
            accent="bg-emerald-500/10 text-emerald-600"
          />
        </StatCardGrid>
        <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Stock Items</CardTitle>
                <CardDescription>A list of all parts and supplies in your inventory.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Supplier</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Price</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24"/></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full"/></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28"/></TableCell>
                        <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-5 w-16"/></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8"/></TableCell>
                    </TableRow>
                ))}
                {!isLoading && inventory && inventory.map((item) => (
                  <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                        <Badge variant={item.stock < 10 ? 'destructive' : item.stock < 50 ? 'warning' : 'default'}>
                            {item.stock} in stock
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.supplier}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">QAR {item.price?.toFixed(2)}</TableCell>
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
                              <DropdownMenuItem onSelect={() => handleRowClick(item)}>
                                <Edit className="mr-2 h-4 w-4" /> Adjust Stock/Edit
                                </DropdownMenuItem>
                               <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleDeleteClick(item)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && (!inventory || inventory.length === 0) && (
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="Your inventory is empty"
                description="Add the parts and supplies you keep on hand to track stock as jobs consume them."
                action={
                  <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Item
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
        
        <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setSelectedItem(null); setIsFormOpen(open)}}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{selectedItem ? 'Edit Inventory Item' : 'Add New Item'}</DialogTitle>
                    <DialogDescription>
                        {selectedItem ? 'Update the details for this item.' : 'Add a new item to your inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <InventoryForm item={selectedItem} onSave={handleSaveItem} onCancel={() => setIsFormOpen(false)} isSubmitting={isSubmitting} />
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
             <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete <span className="font-bold">{selectedItem?.name}</span> from your inventory.
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
