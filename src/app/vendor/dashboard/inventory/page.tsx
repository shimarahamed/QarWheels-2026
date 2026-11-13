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
  import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2, Download } from "lucide-react";
  import { MaterialIcon } from "@/components/ui/material-icon";
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
import { downloadVendorCsv } from "@/lib/vendor-export";
import { filterVendorInventory, type StockFilter } from "@/lib/vendor-catalog";

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
    const { business, activeBranch, canAccess } = useVendor();
    const canWrite = canAccess('inventory', 'write');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WithId<InventoryItem> | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
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
    const { data: inventory, isLoading, error } = useCollection<WithId<InventoryItem>>(inventoryQuery);

    const lowStockCount = (inventory ?? []).filter((item) => item.stock < 10).length;
    const stockValue = (inventory ?? []).reduce((sum, item) => sum + (item.price ?? 0) * (item.stock ?? 0), 0);
    const lowestStockItem = (inventory ?? [])
      .filter((item) => item.stock < 10)
      .sort((a, b) => a.stock - b.stock)[0];

    const outOfStockCount = (inventory ?? []).filter((item) => item.stock === 0).length;
    const visibleInventory = filterVendorInventory(inventory ?? [], search, stockFilter);
    const unavailable = isLoading || !!error || !activeBranch;
    const exportInventory = () => downloadVendorCsv('qarwheel-inventory.csv',
      ['SKU', 'Part name', 'Stock', 'Unit price (QAR)', 'Supplier'],
      visibleInventory.map((item) => [item.sku, item.name, item.stock, item.price, item.supplier]));

    const handleRowClick = (item: WithId<InventoryItem>) => {
        if (!canWrite) return;
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleAddNewClick = () => {
        if (!canWrite || !activeBranch) return;
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (item: WithId<InventoryItem>) => {
        setSelectedItem(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleSaveItem = async (data: z.infer<typeof inventorySchema>) => {
        if (!activeBranch || !canWrite) return;
        setIsSubmitting(true);
        try {
          if (selectedItem) {
            await safeUpdateDoc(doc(firestore, 'branch_inventory', selectedItem.id), data);
          } else {
            await safeAddDoc(collection(firestore, 'branch_inventory'), {
              ...data, businessId: business.id, branchId: activeBranch.id,
            });
          }
          toast({ title: selectedItem ? 'Item Updated' : 'Item Added', description: `"${data.name}" has been saved to inventory.` });
          setIsFormOpen(false);
          setSelectedItem(null);
        } catch {
          toast({ title: 'Could not save item', description: 'Your changes are still in the form. Please try again.', variant: 'destructive' });
        } finally {
          setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItem || !canWrite) return;
        setIsSubmitting(true);
        try {
          await safeDeleteDoc(doc(firestore, 'branch_inventory', selectedItem.id));
          toast({ title: 'Item Deleted', description: `"${selectedItem.name}" has been deleted from inventory.` });
          setIsDeleteConfirmOpen(false);
          setSelectedItem(null);
        } catch {
          toast({ title: 'Could not delete item', description: 'The item has not been removed. Please try again.', variant: 'destructive' });
        } finally {
          setIsSubmitting(false);
        }
    };

    return (
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <PageHeader
          eyebrow="Workshop operations / Inventory depot"
          icon={<MaterialIcon name="inventory_2" className="text-sm" />}
          title="Inventory & Spare Parts Depot"
          description="Track parts, stock levels and suppliers for the selected branch."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={unavailable || visibleInventory.length === 0} onClick={exportInventory}>
                <Download className="mr-2 h-4 w-4" /> Export Stock (CSV)
              </Button>
              {canWrite && <Button onClick={handleAddNewClick} disabled={!activeBranch}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Stock Item
              </Button>}
            </div>
          }
        />

        {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Inventory could not be loaded. Check your connection and reload this page.</div>}
        {!activeBranch && <p role="status" className="text-sm text-muted-foreground">Select a branch to view its inventory.</p>}
        {!unavailable && lowStockCount > 0 && lowestStockItem && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="icon-pill h-9 w-9 shrink-0 bg-destructive/10 text-destructive">
                <MaterialIcon name="priority_high" className="text-base" filled />
              </span>
              <div>
                <p className="text-sm">
                  <span className="font-bold text-destructive">{lowStockCount} item{lowStockCount === 1 ? '' : 's'}</span>{' '}
                  <span className="text-muted-foreground">running low on stock (fewer than 10 units).</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lowest: <span className="font-semibold text-foreground">{lowestStockItem.name}</span> — only{' '}
                  <span className="kpi-number font-bold text-destructive">{lowestStockItem.stock}</span> left · SKU {lowestStockItem.sku}
                </p>
              </div>
            </div>
            {canWrite && <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleRowClick(lowestStockItem)}>
              <MaterialIcon name="edit" className="text-sm" />
              Adjust stock
            </Button>}
          </div>
        )}

        <StatCardGrid>
          <StatCard
            label="Stock items"
            value={unavailable ? '—' : inventory?.length ?? 0}
            icon={<MaterialIcon name="inventory_2" className="text-base" />}
          />
          <StatCard
            label="Low stock"
            value={unavailable ? '—' : lowStockCount}
            icon={<MaterialIcon name="warning" className="text-base" />}
            accent="bg-destructive/10 text-destructive"
            hint="Fewer than 10 in stock"
          />
          <StatCard
            label="Stock value"
            value={unavailable ? '—' : `QAR ${stockValue.toFixed(2)}`}
            icon={<MaterialIcon name="payments" className="text-base" />}
            accent="bg-muted vendor-gold"
          />
          <StatCard label="Out of stock" value={unavailable ? '--' : outOfStockCount}
            icon={<MaterialIcon name="remove_shopping_cart" className="text-base" />}
            accent="bg-destructive/10 text-destructive" hint="Items with zero units" />
        </StatCardGrid>
        <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Depot Stock Matrix</CardTitle>
                  <CardDescription>A list of all parts and supplies in your inventory.</CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <MaterialIcon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
                  <Input
                    aria-label="Search inventory"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by name, SKU, or supplier…"
                    className="pl-9"
                  />
                </div>
            </CardHeader>
          <CardContent>
            <div aria-label="Filter inventory by stock" className="mb-4 flex flex-wrap gap-2">
              {([['all', 'All parts'], ['low', 'Low stock (<10)'], ['out', 'Out of stock'], ['available', 'In stock']] as const).map(([value, label]) => (
                <Button key={value} variant={stockFilter === value ? 'default' : 'outline'} size="sm" aria-pressed={stockFilter === value} onClick={() => setStockFilter(value)}>{label}</Button>
              ))}
            </div>
            <Table>
              <TableHeader className="bg-muted/60 text-[10px] uppercase tracking-wider">
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Supplier</TableHead>
                  <TableHead className="text-right">Unit price (QAR)</TableHead>
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
                        <TableCell className="text-right"><Skeleton className="h-5 w-16"/></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8"/></TableCell>
                    </TableRow>
                ))}
                {!unavailable && inventory && visibleInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[240px] whitespace-normal font-medium">
                      {canWrite ? <button type="button" className="text-left font-semibold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => handleRowClick(item)}>{item.name}</button> : item.name}
                      <p className="mt-1 font-mono text-xs text-muted-foreground sm:hidden">{item.sku}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                        <Badge variant={item.stock === 0 ? 'destructive' : item.stock < 10 ? 'warning' : 'outline'} className="kpi-number gap-1.5">
                            <span className={`status-dot ${item.stock === 0 ? 'bg-destructive-foreground' : item.stock < 10 ? 'bg-amber-900' : 'bg-emerald-500'}`} />
                            {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{item.supplier}</TableCell>
                    <TableCell className="text-right kpi-number">{item.price?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions for {item.name}</span>
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
                      </DropdownMenu>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!unavailable && inventory && inventory.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="inventory_2" className="text-3xl" />}
                title="Your inventory is empty"
                description="Add the parts and supplies you keep on hand to track stock as jobs consume them."
                action={
                  canWrite ? <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Stock Item
                  </Button> : undefined
                }
              />
            )}
            {!unavailable && inventory && inventory.length > 0 && visibleInventory.length === 0 && (
              <EmptyState
                icon={<MaterialIcon name="search" className="text-3xl" />}
                title="No items match your filters"
                description="Try another search or stock filter."
              />
            )}
          </CardContent>
          {!unavailable && inventory && inventory.length > 0 && (
            <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
              <span>Showing {visibleInventory.length} of {inventory.length} items</span>
            </div>
          )}
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
                <AlertDialogAction disabled={isSubmitting} onClick={(event) => { event.preventDefault(); void handleDeleteConfirm(); }}>{isSubmitting ? 'Deleting...' : 'Delete item'}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
