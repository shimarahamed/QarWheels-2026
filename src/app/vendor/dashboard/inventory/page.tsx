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
  import { MoreHorizontal, PlusCircle, Edit, Trash2 } from "lucide-react";
  import { mockInventory, VendorInventoryItem } from "@/lib/vendor-data";
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

function InventoryForm({ item, onSave, onCancel }: { item?: VendorInventoryItem | null, onSave: (data: VendorInventoryItem) => void, onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorInventoryItem>({
    defaultValues: item || {},
  });

  useEffect(() => {
    reset(item || { name: '', sku: '', stock: 0, price: 0, supplier: '' });
  }, [item, reset]);

  const onSubmit = (data: VendorInventoryItem) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" {...register("name", { required: "Name is required" })} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" {...register("sku", { required: "SKU is required" })} />
        {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register("stock", { required: "Stock is required", valueAsNumber: true, min: 0 })} />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (QAR)</Label>
            <Input id="price" type="number" step="0.01" {...register("price", { required: "Price is required", valueAsNumber: true, min: 0 })} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" {...register("supplier", { required: "Supplier is required" })} />
        {errors.supplier && <p className="text-sm text-destructive">{errors.supplier.message}</p>}
      </div>
      <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Item</Button>
      </DialogFooter>
    </form>
  );
}

export default function VendorInventoryPage() {
    const [inventory, setInventory] = useState(mockInventory);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VendorInventoryItem | null>(null);
    const { toast } = useToast();

    const handleRowClick = (item: VendorInventoryItem) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (item: VendorInventoryItem) => {
        setSelectedItem(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveItem = (data: VendorInventoryItem) => {
        let message = "";
        if (selectedItem && selectedItem.id) {
            // Update
            setInventory(prev => prev.map(item => item.id === selectedItem.id ? {...data, id: selectedItem.id } : item));
            message = `"${data.name}" has been updated.`;
        } else {
            // Create
            const newItem = { ...data, id: `inv-${Date.now()}` };
            setInventory(prev => [newItem, ...prev]);
            message = `"${data.name}" has been added to inventory.`;
        }
        toast({
            title: selectedItem ? "Item Updated" : "Item Added",
            description: message,
        });
        setIsFormOpen(false);
        setSelectedItem(null);
    }

     const handleDeleteConfirm = () => {
        if (!selectedItem) return;
        setInventory(prev => prev.filter(item => item.id !== selectedItem.id));
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
                {inventory.map((item) => (
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
                <InventoryForm item={selectedItem} onSave={handleSaveItem} onCancel={() => setIsFormOpen(false)} />
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
  