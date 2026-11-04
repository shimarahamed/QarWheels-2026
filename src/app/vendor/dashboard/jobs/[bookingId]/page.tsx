'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { doc, Timestamp, arrayUnion, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { MaterialIcon } from '@/components/ui/material-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingPanel, ErrorState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { useBookingTransition } from '@/hooks/use-booking-transition';
import { useStaffRoster } from '@/hooks/use-staff-roster';
import { useVendor } from '@/components/vendor/vendor-provider';
import { useDoc, useCollection, useFirebase, useMemoFirebase, useUser, safeUpdateDoc } from '@/firebase';
import { JobStatusStepper } from '@/components/vendor/jobs/job-status-stepper';
import { PartsPanel } from '@/components/vendor/jobs/parts-panel';
import { LaborLog } from '@/components/vendor/jobs/labor-log';
import { StatusHistoryTimeline } from '@/components/vendor/jobs/status-history-timeline';
import { DeclineDialog } from '@/components/vendor/bookings/decline-dialog';
import { nextForwardStatus } from '@/lib/types';
import type { Booking, BookingLaborEntry, InventoryItem, WithId } from '@/lib/types';

function toDate(value: Booking['bookingDate']) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

export default function JobCardPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { canPerform } = useVendor();
  const { transition, pendingId } = useBookingTransition();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [isSavingCost, setIsSavingCost] = useState(false);

  const bookingRef = useMemoFirebase(
    () => (params.bookingId ? doc(firestore, 'bookings', params.bookingId) : null),
    [firestore, params.bookingId],
  );
  const { data: booking, isLoading, error } = useDoc<Booking>(bookingRef);

  const inventoryQuery = useMemoFirebase(
    () =>
      booking
        ? query(
            collection(firestore, 'branch_inventory'),
            where('businessId', '==', booking.businessId),
            where('branchId', '==', booking.branchId),
          )
        : null,
    [firestore, booking],
  );
  const { data: inventory } = useCollection<WithId<InventoryItem>>(inventoryQuery);

  // Client `list` queries against `memberships` are rejected by
  // firestore.rules, so this reads through /api/vendor/staff/roster instead
  // (see useStaffRoster).
  const { data: staff } = useStaffRoster(booking?.businessId);

  const [costDraft, setCostDraft] = useState<string | null>(null);
  const isPending = pendingId === params.bookingId;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <LoadingPanel rows={5} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <ErrorState description="This job card couldn't be found, or you don't have access to it." />
      </div>
    );
  }

  const canEditCost = canPerform('bookings.editCost');
  const next = nextForwardStatus(booking.status);
  const bookingDate = toDate(booking.bookingDate);
  const cost = costDraft ?? String(booking.cost ?? 0);

  async function saveField(patch: Record<string, unknown>) {
    if (!bookingRef) return;
    await safeUpdateDoc(bookingRef, { ...patch, updatedAt: serverTimestamp() });
  }

  async function handleAssignStaff(staffId: string) {
    if (!booking) return;
    // Radix Select.Item forbids value="" (it's reserved to mean "clear and
    // show the placeholder"), so the unassign option uses this sentinel
    // instead and it's translated back to null here.
    const resolvedId = staffId === 'unassigned' ? null : staffId;
    const member = (staff ?? []).find((s) => s.id === resolvedId);
    try {
      await saveField({
        assignedStaffId: resolvedId,
        assignedStaffName: member?.displayName ?? null,
      });
    } catch {
      toast({ title: 'Could not assign staff', variant: 'destructive' });
    }
  }

  async function handlePartsChange(next: Booking['partsUsed']) {
    try {
      await saveField({ partsUsed: next ?? [] });
    } catch {
      toast({ title: 'Could not update parts', variant: 'destructive' });
    }
  }

  async function handleAddLabor(entry: BookingLaborEntry) {
    if (!bookingRef) return;
    try {
      await safeUpdateDoc(bookingRef, { laborEntries: arrayUnion(entry), updatedAt: serverTimestamp() });
    } catch {
      toast({ title: 'Could not log time', variant: 'destructive' });
    }
  }

  async function handleRemoveLabor(index: number) {
    if (!booking) return;
    const next = (booking.laborEntries ?? []).filter((_, i) => i !== index);
    try {
      await saveField({ laborEntries: next });
    } catch {
      toast({ title: 'Could not remove entry', variant: 'destructive' });
    }
  }

  async function handleSaveCost() {
    const value = Number.parseFloat(cost);
    if (!Number.isFinite(value) || value < 0) {
      toast({ title: 'Enter a valid cost', variant: 'destructive' });
      return;
    }
    setIsSavingCost(true);
    try {
      await saveField({ cost: value });
      toast({ title: 'Cost updated' });
      setCostDraft(null);
    } catch {
      toast({ title: 'Could not update cost', variant: 'destructive' });
    } finally {
      setIsSavingCost(false);
    }
  }

  const partsTotal = (booking.partsUsed ?? []).reduce((sum, p) => sum + p.qty * p.unitPrice, 0);
  const activeStaff = (staff ?? []).filter((s) => s.status === 'Active');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5 text-muted-foreground" onClick={() => router.push('/vendor/dashboard/bookings')}>
          <MaterialIcon name="arrow_back" className="text-base" />
          Back to bookings
        </Button>

        <Card className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="card-accent-top from-primary via-[var(--qw-gold)] to-transparent" />
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={booking.status} />
                  <Badge variant="outline" className="text-[11px]">{format(bookingDate, 'MMM d, yyyy · h:mm a')}</Badge>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{booking.serviceName}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MaterialIcon name="directions_car" className="text-sm" />
                  {booking.carDescription ?? 'Vehicle details unavailable'}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {booking.status === 'Pending' ? (
                  <>
                    <Button
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isPending}
                      onClick={async () => { await transition({ bookingId: booking.id, status: 'Confirmed' }); }}
                    >
                      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Accept job
                    </Button>
                    <Button variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/8" disabled={isPending} onClick={() => setDeclineOpen(true)}>
                      Decline
                    </Button>
                  </>
                ) : next ? (
                  <Button
                    className="gap-1.5"
                    disabled={isPending}
                    onClick={async () => { await transition({ bookingId: params.bookingId, status: next }); }}
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Mark as {next}
                  </Button>
                ) : null}
              </div>
            </div>

            <JobStatusStepper status={booking.status} />

            <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
              <div className="flex items-center gap-2.5">
                <span className="icon-pill h-9 w-9 bg-primary/10 text-primary"><MaterialIcon name="mail" className="text-base" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{booking.customerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{booking.customerEmail}</p>
                </div>
              </div>
              {booking.customerPhone && (
                <div className="flex items-center gap-2.5">
                  <span className="icon-pill h-9 w-9 bg-sky-500/10 text-sky-600"><MaterialIcon name="call" className="text-base" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Contact</p>
                    <p className="truncate text-xs text-muted-foreground">{booking.customerPhone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <span className="icon-pill h-9 w-9 bg-violet-500/10 text-violet-600"><MaterialIcon name="engineering" className="text-base" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Assigned to</p>
                  {activeStaff.length > 0 ? (
                    <Select value={booking.assignedStaffId || 'unassigned'} onValueChange={handleAssignStaff}>
                      <SelectTrigger className="mt-0.5 h-7 border-0 bg-transparent p-0 text-xs text-muted-foreground shadow-none focus:ring-0">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {activeStaff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">{booking.assignedStaffName ?? 'Unassigned'}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-xl border bg-card shadow-sm">
          <CardContent className="p-0">
            <Tabs defaultValue="parts">
              <div className="border-b p-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="parts" className="gap-1.5"><MaterialIcon name="inventory_2" className="text-sm" /> Parts</TabsTrigger>
                  <TabsTrigger value="labor" className="gap-1.5"><MaterialIcon name="schedule" className="text-sm" /> Labor</TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5"><MaterialIcon name="edit_note" className="text-sm" /> Notes</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="parts" className="p-4">
                <PartsPanel partsUsed={booking.partsUsed ?? []} inventory={inventory} onChange={handlePartsChange} />
              </TabsContent>
              <TabsContent value="labor" className="p-4">
                <LaborLog
                  entries={booking.laborEntries ?? []}
                  staff={staff}
                  currentUserUid={user?.uid ?? ''}
                  onAdd={handleAddLabor}
                  onRemove={handleRemoveLabor}
                  isSubmitting={false}
                />
              </TabsContent>
              <TabsContent value="notes" className="space-y-3 p-4">
                <Label className="text-xs text-muted-foreground">Internal notes</Label>
                <Textarea
                  defaultValue={booking.notes ?? ''}
                  placeholder="Diagnostics, customer requests, anything the next shift should know…"
                  rows={5}
                  onBlur={(e) => { void saveField({ notes: e.target.value }); }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="rounded-xl border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Job total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Parts</span>
                <span className="kpi-number font-semibold">QAR {partsTotal.toFixed(2)}</span>
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="cost" className="text-xs text-muted-foreground">Final cost (QAR)</Label>
                {canEditCost ? (
                  <div className="flex gap-2">
                    <Input id="cost" inputMode="decimal" value={cost} onChange={(e) => setCostDraft(e.target.value)} />
                    <Button size="icon" className="shrink-0" disabled={isSavingCost} onClick={handleSaveCost}>
                      {isSavingCost ? <Loader2 className="h-4 w-4 animate-spin" /> : <MaterialIcon name="receipt_long" className="text-base" />}
                    </Button>
                  </div>
                ) : (
                  <p className="kpi-number text-lg">QAR {(booking.cost ?? 0).toFixed(2)}</p>
                )}
              </div>
              {booking.status === 'Completed' && (
                <Button asChild variant="outline" className="w-full gap-1.5">
                  <a href={`/vendor/dashboard/invoices?bookingId=${booking.id}`}>
                    <MaterialIcon name="receipt_long" className="text-base" />
                    Create invoice from this job
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <StatusHistoryTimeline history={booking.statusHistory ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>

      <DeclineDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        isSubmitting={isPending}
        onConfirm={async (reason) => {
          const ok = await transition({ bookingId: params.bookingId, status: 'Declined', declinedReason: reason });
          if (ok) setDeclineOpen(false);
        }}
      />
    </div>
  );
}
