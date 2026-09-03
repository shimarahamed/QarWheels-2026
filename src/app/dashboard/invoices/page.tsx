'use client';

import { useState } from 'react';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Receipt } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatMinorUnits } from '@/lib/money';
import type { Invoice, InvoiceStatus, WithId } from '@/lib/types';

const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  Draft: { variant: 'secondary' },
  Sent: { variant: 'outline', className: 'border-sky-500/30 bg-sky-500/10 text-sky-600' },
  Paid: { variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-500' },
  Void: { variant: 'outline', className: 'border-muted-foreground/30 text-muted-foreground line-through' },
};

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CustomerInvoicesPage() {
  const { firestore, user } = useFirebase();
  const [selected, setSelected] = useState<WithId<Invoice> | null>(null);

  // Read straight from Firestore — the rules already scope a customer to
  // invoices where userId matches their uid, so no vendor API call is needed.
  const invoicesQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'invoices'), where('userId', '==', user.uid)) : null),
    [firestore, user],
  );
  const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

  const sorted = [...(invoices ?? [])].sort((a, b) => {
    const aDate = typeof a.createdAt === 'string' ? a.createdAt : '';
    const bDate = typeof b.createdAt === 'string' ? b.createdAt : '';
    return bDate.localeCompare(aDate);
  });

  const totalOutstanding = sorted
    .filter((inv) => inv.status === 'Sent')
    .reduce((sum, inv) => sum + inv.totalMinorUnits, 0);
  const totalPaid = sorted
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalMinorUnits, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
          <Receipt className="h-3.5 w-3.5" />
          Billing
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your invoices.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Every invoice issued to you for completed work. Tap one to see the full breakdown.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Invoices', value: isLoading ? null : String(sorted.length), tone: 'text-foreground' },
          { label: 'Outstanding', value: isLoading ? null : formatMinorUnits(totalOutstanding), tone: 'text-amber-600' },
          { label: 'Paid', value: isLoading ? null : formatMinorUnits(totalPaid), tone: 'text-emerald-600' },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                {metric.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metric.value === null ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className={`text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>Issued by the garages you have booked with.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Issued</TableHead>
                <TableHead className="hidden md:table-cell text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                sorted.map((invoice) => {
                  const badge = INVOICE_STATUS_BADGE[invoice.status] ?? INVOICE_STATUS_BADGE.Draft;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(invoice)}
                    >
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground">
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
          {!isLoading && sorted.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-10 w-10 text-primary/50" />
              <p>No invoices yet. One appears here once a garage bills you for completed work.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Issued {formatDate(selected?.issuedAt ?? selected?.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border p-3">
                {selected.lineItems.map((item, i) => (
                  <div key={`${item.description}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatMinorUnits(item.unitPriceMinorUnits)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">
                      {formatMinorUnits(item.quantity * item.unitPriceMinorUnits)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMinorUnits(selected.subtotalMinorUnits)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatMinorUnits(selected.taxMinorUnits)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-1 text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatMinorUnits(selected.totalMinorUnits)}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm leading-6">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
