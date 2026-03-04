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
  import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Package } from "lucide-react";
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
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
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
    const { vendor } = useVendor();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WithId<InventoryItem> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const inventoryRef = useMemoFirebase(() => vendor ? collection(firestore, 'vendors', vendor.id, 'inventory') : null, [firestore, vendor]);
    const { data: inventory, isLoading } = useCollection<WithId<InventoryItem>>(inventoryRef);

    const handleRowClick = (item: WithId<InventoryItem>) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, item: WithId<InventoryItem>) => {
        e.stopPropagation();
        setSelectedItem(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveItem = (data: z.infer<typeof inventorySchema>) => {
        if (!vendor || !inventoryRef) return;
        setIsSubmitting(true);
        if (selectedItem) {
            // Update
            const itemDocRef = doc(firestore, 'vendors', vendor.id, 'inventory', selectedItem.id);
            updateDocumentNonBlocking(itemDocRef, data);
            toast({ title: "Item Updated", description: `"${data.name}" has been updated.`});
        } else {
            // Create
            addDocumentNonBlocking(inventoryRef, data);
            toast({ title: "Item Added", description: `"${data.name}" has been added to inventory.` });
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
        setSelectedItem(null);
    }

     const handleDeleteConfirm = () => {
        if (!selectedItem || !vendor) return;
        const itemDocRef = doc(firestore, 'vendors', vendor.id, 'inventory', selectedItem.id);
        deleteDocumentNonBlocking(itemDocRef);
        toast({
            title: "Item Deleted",
            description: `The item "${selectedItem.name}" has been deleted from inventory.`,
            variant: "destructive"
        });
        setIsDeleteConfirmOpen(false);
        setSelectedItem(null);
    }

    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track stock levels, suppliers, and part prices.
            </p>
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Item
          </Button>
        </header>
        <Card>
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
                              <DropdownMenuItem onSelect={(e) => handleDeleteClick(e, item)} className="text-destructive focus:text-destructive">
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
              <div className="text-center text-muted-foreground p-8">
                <Package className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                <p>Your inventory is empty.</p>
              </div>
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
  