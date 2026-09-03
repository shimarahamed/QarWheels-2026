'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Minus, Package, Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BOOKING_TRANSITIONS } from '@/lib/types';
import type { Booking, BookingStatus, InventoryItem, WithId } from '@/lib/types';

/**
 * Staff/membership is deferred to a later phase — this stands in for the
 * deleted StaffMember type so the assignment picker keeps compiling against
 * the legacy `vendors/{businessId}/staff` subcollection.
 */
export type StaffMember = {
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
};

const BOOKING_STATUSES = [
  'Pending',
  'Confirmed',
  'VehicleReceived',
  'InProgress',
  'ReadyForPickup',
  'Completed',
  'Declined',
  'Cancelled',
  'NoShow',
] as const;

export const editBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  cost: z.coerce.number().min(0, 'Cost must be a positive number'),
  assignedStaffId: z.string().optional(),
  assignedStaffName: z.string().optional(),
  partsUsed: z
    .array(
      z.object({
        inventoryItemId: z.string(),
        name: z.string(),
        qty: z.coerce.number().int().min(1),
        unitPrice: z.number(),
      }),
    )
    .optional(),
});

export type EditBookingValues = z.infer<typeof editBookingSchema>;

export function EditBookingForm({
  booking,
  onSave,
  onCancel,
  isSubmitting,
  inventory,
  staff,
}: {
  booking: WithId<Booking>;
  onSave: (data: EditBookingValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  inventory: WithId<InventoryItem>[] | null | undefined;
  staff: WithId<StaffMember>[] | null | undefined;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditBookingValues>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: {
      status: booking.status,
      cost: booking.cost || 0,
      assignedStaffId: booking.assignedStaffId || '',
      assignedStaffName: booking.assignedStaffName || '',
      partsUsed: booking.partsUsed || [],
    },
  });
  // Current status stays selectable (a no-op save), plus every legal next state.
  const statusOptions: BookingStatus[] = [booking.status, ...BOOKING_TRANSITIONS[booking.status]];
  const partsUsed = watch('partsUsed') || [];

  function addPart(item: WithId<InventoryItem>) {
    const existing = partsUsed.find((p) => p.inventoryItemId === item.id);
    if (existing) {
      setValue(
        'partsUsed',
        partsUsed.map((p) => (p.inventoryItemId === item.id ? { ...p, qty: p.qty + 1 } : p)),
      );
    } else {
      setValue('partsUsed', [
        ...partsUsed,
        { inventoryItemId: item.id, name: item.name, qty: 1, unitPrice: item.price },
      ]);
    }
  }

  function removePart(itemId: string) {
    const existing = partsUsed.find((p) => p.inventoryItemId === itemId);
    if (!existing) return;
    if (existing.qty <= 1) {
      setValue('partsUsed', partsUsed.filter((p) => p.inventoryItemId !== itemId));
    } else {
      setValue(
        'partsUsed',
        partsUsed.map((p) => (p.inventoryItemId === itemId ? { ...p, qty: p.qty - 1 } : p)),
      );
    }
  }

  const partsTotal = partsUsed.reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const activeStaff = (staff || []).filter((s) => s.status === 'Active');

  return (
    <form onSubmit={handleSubmit(onSave)} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 pt-4">
      {/* Status + Cost */}
      <div className="grid grid-cols-2 gap-4">
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
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Final Cost (QAR)</Label>
          <Input id="cost" type="number" step="0.01" {...register('cost')} />
          {errors.cost && <p className="text-sm text-destructive">{errors.cost.message}</p>}
        </div>
      </div>

      {/* Staff assignment */}
      {activeStaff.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Assign Staff
          </Label>
          <Controller
            control={control}
            name="assignedStaffId"
            render={({ field }) => (
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  const member = activeStaff.find((s) => s.id === val);
                  setValue('assignedStaffName', member?.name || '');
                }}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {activeStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Parts used */}
      {inventory && inventory.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Parts Used
          </Label>
          <div className="divide-y rounded-xl border text-sm">
            {inventory.map((item) => {
              const used = partsUsed.find((p) => p.inventoryItemId === item.id);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      QAR {item.price.toFixed(2)} · {item.stock} in stock
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {used ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 sm:h-7 sm:w-7"
                          onClick={() => removePart(item.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center font-bold">{used.qty}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 sm:h-7 sm:w-7"
                          onClick={() => addPart(item)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addPart(item)}>
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
              Parts subtotal: <span className="font-semibold text-foreground">QAR {partsTotal.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
