'use client';

import { Minus, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatMinorUnitsAmount } from '@/lib/money';
import type { BookingPart, InventoryItem, WithId } from '@/lib/types';

/**
 * Parts consumed on a job, sourced live from branch inventory so pricing
 * always matches the current catalog and stock levels stay visible while
 * picking. `Booking.cost` is major-unit QAR (unlike invoices' minor units),
 * so totals here are computed and displayed in that same unit.
 */
export function PartsPanel({
  partsUsed,
  inventory,
  onChange,
}: {
  partsUsed: BookingPart[];
  inventory: WithId<InventoryItem>[] | null | undefined;
  onChange: (next: BookingPart[]) => void;
}) {
  function addPart(item: WithId<InventoryItem>) {
    const existing = partsUsed.find((p) => p.inventoryItemId === item.id);
    if (existing) {
      onChange(partsUsed.map((p) => (p.inventoryItemId === item.id ? { ...p, qty: p.qty + 1 } : p)));
    } else {
      onChange([...partsUsed, { inventoryItemId: item.id, name: item.name, qty: 1, unitPrice: item.price }]);
    }
  }

  function removePart(itemId: string) {
    const existing = partsUsed.find((p) => p.inventoryItemId === itemId);
    if (!existing) return;
    if (existing.qty <= 1) {
      onChange(partsUsed.filter((p) => p.inventoryItemId !== itemId));
    } else {
      onChange(partsUsed.map((p) => (p.inventoryItemId === itemId ? { ...p, qty: p.qty - 1 } : p)));
    }
  }

  const partsTotal = partsUsed.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);

  if (!inventory || inventory.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-7 w-7" />}
        title="No inventory items yet"
        description="Add stock items in Inventory to pull them onto a job card."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="divide-y rounded-xl border text-sm">
        {inventory.map((item) => {
          const used = partsUsed.find((p) => p.inventoryItemId === item.id);
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  QAR {item.price.toFixed(2)} · {item.stock} in stock
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {used ? (
                  <>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => removePart(item.id)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center font-bold tabular-nums">{used.qty}</span>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => addPart(item)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => addPart(item)}>
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {partsUsed.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          Parts subtotal: <span className="font-semibold tabular-nums text-foreground">QAR {formatMinorUnitsAmount(Math.round(partsTotal * 100))}</span>
        </p>
      )}
    </div>
  );
}
