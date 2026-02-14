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
  import { MoreHorizontal, PlusCircle } from "lucide-react";
  import { mockInventory, VendorInventoryItem } from "@/lib/vendor-data";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";


function EditInventoryForm({ item, onFormSubmit }: { item: VendorInventoryItem, onFormSubmit: () => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorInventoryItem>({
    defaultValues: item,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
        reset(item);
    }
  }, [item, reset]);

  const onSubmit = (data: VendorInventoryItem) => {
    console.log("Updated item data:", data); // API call
    toast({
      title: "Inventory Item Updated",
      description: `"${data.name}" has been successfully updated.`,
    });
    onFormSubmit();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Input id="stock" type="number" {...register("stock", { required: "Stock is required", valueAsNumber: true })} />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (QAR)</Label>
            <Input id="price" type="number" step="0.01" {...register("price", { required: "Price is required", valueAsNumber: true })} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input id="supplier" {...register("supplier", { required: "Supplier is required" })} />
        {errors.supplier && <p className="text-sm text-destructive">{errors.supplier.message}</p>}
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

export default function VendorInventoryPage() {
    const [inventory, setInventory] = useState(mockInventory);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<VendorInventoryItem | null>(null);

    const handleEditClick = (item: VendorInventoryItem) => {
        setSelectedItem(item);
        setIsEditDialogOpen(true);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setIsEditDialogOpen(isOpen);
        if (!isOpen) {
            setSelectedItem(null);
        }
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
          <Button>
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
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                        <Badge variant={item.stock < 10 ? 'warning' : item.stock < 50 ? 'outline' : 'secondary'}>
                            {item.stock} in stock
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.supplier}</TableCell>
                    <TableCell className="text-right">QAR {item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleEditClick(item)}>Edit Item</DropdownMenuItem>
                              <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive-foreground">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {selectedItem && (
            <Dialog open={isEditDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Inventory Item</DialogTitle>
                        <DialogDescription>
                            Update the details for this item.
                        </DialogDescription>
                    </DialogHeader>
                    <EditInventoryForm item={selectedItem} onFormSubmit={() => handleOpenChange(false)} />
                </DialogContent>
            </Dialog>
        )}
      </div>
    );
  }
  
