'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2, PlusCircle, Receipt, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatMinorUnits, parseMajorUnitsToMinor } from '@/lib/money';
import type { Booking, Invoice, InvoiceStatus, WithId } from '@/lib/types';

const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  Draft: { variant: 'secondary' },
  Sent: { variant: 'outline', className: 'border-sky-500/30 bg-sky-500/10 text-sky-600' },
  Paid: { variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-500' },
  Void: { variant: 'outline', className: 'border-muted-foreground/30 text-muted-foreground line-through' },
};

/** A line item as the user is editing it — prices stay strings until submit. */
type DraftLineItem = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function emptyLineItem(): DraftLineItem {
  return { key: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '' };
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function VendorInvoicesPage() {
  const { business, activeBranch, canSeeAllBranches } = useVendor();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<WithId<Invoice>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookingId, setBookingId] = useState<string>('');
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([emptyLineItem()]);
  const [taxInput, setTaxInput] = useState('');
  const [notes, setNotes] = useState('');

  // Completed bookings for the current branch scope — owners/admins see the
  // whole business, branch-scoped roles see only their active branch.
  const completedBookingsQuery = useMemoFirebase(
    () =>
      canSeeAllBranches
        ? query(
            collection(firestore, 'bookings'),
            where('businessId', '==', business.id),
            where('status', '==', 'Completed'),
          )
        : activeBranch
          ? query(
              collection(firestore, 'bookings'),
              where('branchId', '==', activeBranch.id),
              where('status', '==', 'Completed'),
            )
          : null,
    [firestore, business.id, activeBranch, canSeeAllBranches],
  );
  const { data: completedBookings } = useCollection<Booking>(completedBookingsQuery);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/vendor/invoices?businessId=${business.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not load invoices');
      }
      const { data } = await res.json();
      setInvoices(data.invoices);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not load invoices.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, business.id, toast]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  // A booking can only ever carry one invoice, so hide the ones already done.
  const invoicedBookingIds = useMemo(
    () => new Set((invoices ?? []).map((inv) => inv.bookingId)),
    [invoices],
  );
  const invoiceableBookings = useMemo(
    () =>
      (completedBookings ?? [])
        .filter((b) => !invoicedBookingIds.has(b.id))
        .filter((b) => (canSeeAllBranches || !activeBranch ? true : b.branchId === activeBranch.id)),
    [completedBookings, invoicedBookingIds, canSeeAllBranches, activeBranch],
  );

  const selectedBooking = invoiceableBookings.find((b) => b.id === bookingId) ?? null;

  // Live total, computed in minor units throughout — no float arithmetic.
  const subtotalMinorUnits = lineItems.reduce((sum, item) => {
    const qty = Number.parseInt(item.quantity, 10);
    const unit = parseMajorUnitsToMinor(item.unitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || unit === null) return sum;
    return sum + qty * unit;
  }, 0);
  const taxMinorUnits = parseMajorUnitsToMinor(taxInput) ?? 0;
  const totalMinorUnits = subtotalMinorUnits + taxMinorUnits;

  const resetForm = () => {
    setBookingId('');
    setLineItems([emptyLineItem()]);
    setTaxInput('');
    setNotes('');
  };

  const updateLineItem = (key: string, patch: Partial<DraftLineItem>) => {
    setLineItems((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!bookingId) {
      toast({ title: 'Select a booking', description: 'An invoice must start from a completed booking.', variant: 'destructive' });
      return;
    }

    // Validate into the exact shape the route's zod schema expects, so a
    // mistyped price becomes a readable message here rather than a 400.
    const payloadItems: { description: string; quantity: number; unitPriceMinorUnits: number }[] = [];
    for (const item of lineItems) {
      const description = item.description.trim();
      const qty = Number.parseInt(item.quantity, 10);
      const unit = parseMajorUnitsToMinor(item.unitPrice);
      if (!description && !item.unitPrice.trim()) continue; // untouched blank row
      if (!description) {
        toast({ title: 'Missing description', description: 'Every line item needs a description.', variant: 'destructive' });
        return;
      }
      if (!Number.isInteger(qty) || qty < 1) {
        toast({ title: 'Invalid quantity', description: `"${description}" needs a whole quantity of at least 1.`, variant: 'destructive' });
        return;
      }
      if (unit === null) {
        toast({ title: 'Invalid price', description: `"${description}" needs a valid unit price.`, variant: 'destructive' });
        return;
      }
      payloadItems.push({ description, quantity: qty, unitPriceMinorUnits: unit });
    }

    if (payloadItems.length === 0) {
      toast({ title: 'Add a line item', description: 'An invoice needs at least one line item.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/vendor/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingId,
          lineItems: payloadItems,
          taxMinorUnits,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create invoice');
      }
      const { data } = await res.json();
      toast({
        title: `Invoice ${data.invoiceNumber} created`,
        description: `${formatMinorUnits(data.totalMinorUnits)} invoiced to ${selectedBooking?.customerName ?? 'the customer'}.`,
      });
      setIsCreateOpen(false);
      resetForm();
      void fetchInvoices();
    } catch (e) {
      toast({
        title: 'Could not create invoice',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalInvoiced = (invoices ?? []).reduce((sum, inv) => sum + inv.totalMinorUnits, 0);
  const totalPaid = (invoices ?? [])
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalMinorUnits, 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              <Receipt className="h-3.5 w-3.5" />
              Billing
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Invoice the work you have completed.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Turn a completed booking into an itemised invoice your customer can see in their own dashboard.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Button
              onClick={() => { resetForm(); setIsCreateOpen(true); }}
              disabled={invoiceableBookings.length === 0}
              className="justify-start"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
            {invoiceableBookings.length === 0 && (
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Every completed booking has already been invoiced.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Invoices issued', value: isLoading ? null : String(invoices?.length ?? 0), tone: 'text-foreground' },
          { label: 'Total invoiced', value: isLoading ? null : formatMinorUnits(totalInvoiced), tone: 'text-foreground' },
          { label: 'Total paid', value: isLoading ? null : formatMinorUnits(totalPaid), tone: 'text-emerald-600' },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                {metric.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metric.value === null ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className={`text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Invoices issued by {business.displayName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Issued</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                invoices?.map((invoice) => {
                  const badge = INVOICE_STATUS_BADGE[invoice.status] ?? INVOICE_STATUS_BADGE.Draft;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          {invoice.customerName}
                          <div className="hidden text-sm text-muted-foreground md:block">{invoice.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                        {formatMinorUnits(invoice.subtotalMinorUnits)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatMinorUnits(invoice.totalMinorUnits)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={badge.variant} className={badge.className}>{invoice.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {!isLoading && (!invoices || invoices.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-10 w-10 text-primary/50" />
              <p>No invoices yet. Create one from a completed booking.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Start from a completed booking, then itemise the work. Totals update as you type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="booking">Completed booking</Label>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger id="booking">
                  <SelectValue placeholder="Select a completed booking" />
                </SelectTrigger>
                <SelectContent>
                  {invoiceableBookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.customerName} — {booking.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBooking && (
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.customerEmail}
                  {selectedBooking.carDescription ? ` · ${selectedBooking.carDescription}` : ''}
                  {` · ${selectedBooking.branchName}`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setLineItems((items) => [...items, emptyLineItem()])}>
                  <PlusCircle className="mr-2 h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                {lineItems.map((item) => {
                  const qty = Number.parseInt(item.quantity, 10);
                  const unit = parseMajorUnitsToMinor(item.unitPrice);
                  const lineTotal = Number.isFinite(qty) && qty > 0 && unit !== null ? qty * unit : 0;
                  return (
                    <div key={item.key} className="grid grid-cols-12 items-end gap-2">
                      <div className="col-span-12 space-y-1 sm:col-span-5">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(item.key, { description: e.target.value })}
                          placeholder="e.g. Engine oil 5W-30"
                        />
                      </div>
                      <div className="col-span-3 space-y-1 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.key, { quantity: e.target.value })}
                          inputMode="numeric"
                          placeholder="1"
                        />
                      </div>
                      <div className="col-span-5 space-y-1 sm:col-span-3">
                        <Label className="text-xs text-muted-foreground">Unit price (QAR)</Label>
                        <Input
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.key, { unitPrice: e.target.value })}
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-4 flex items-center justify-end gap-1 sm:col-span-2">
                        <span className="truncate text-sm font-semibold">{formatMinorUnits(lineTotal)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          disabled={lineItems.length === 1}
                          onClick={() => setLineItems((items) => items.filter((i) => i.key !== item.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove line item</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax">Tax (QAR)</Label>
                <Input
                  id="tax"
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note for the customer"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMinorUnits(subtotalMinorUnits)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatMinorUnits(taxMinorUnits)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-1 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatMinorUnits(totalMinorUnits)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isSubmitting || !bookingId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
