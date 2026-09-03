'use client';

import { useState, useMemo } from "react";
import { collection, doc, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import {
  CalendarCheck, CheckCircle2, CircleDollarSign, Clock,
  Edit, Loader2, Search, Trash2, Eye, Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCollection, useFirebase, useMemoFirebase, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_TRANSITIONS } from "@/lib/types";
import type { Booking, BookingStatus, UserProfile, WithId } from "@/lib/types";

function toDate(v: Booking["bookingDate"]) {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

const BOOKING_STATUSES = [
  "Pending",
  "Confirmed",
  "VehicleReceived",
  "InProgress",
  "ReadyForPickup",
  "Completed",
  "Declined",
  "Cancelled",
  "NoShow",
] as const;

const bookingEditSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  notes: z.string().optional(),
  assignedStaffName: z.string().optional(),
});
type BookingEditForm = z.infer<typeof bookingEditSchema>;

type TabStatus = "All" | BookingStatus;

export default function AdminBookingsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabStatus>("All");
  const [editBooking, setEditBooking] = useState<WithId<Booking> | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<WithId<Booking> | null>(null);
  const [viewBooking, setViewBooking] = useState<WithId<Booking> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const { data: bookings, isLoading: loadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);
  const { data: users, isLoading: loadingUsers } = useCollection<WithId<UserProfile>>(usersQuery);

  const usersMap = useMemo(() => {
    const map: Record<string, WithId<UserProfile>> = {};
    for (const u of users || []) map[u.id] = u;
    return map;
  }, [users]);

  const stats = useMemo(() => {
    const all = bookings || [];
    return {
      total: all.length,
      completed: all.filter(b => b.status === "Completed").length,
      pending: all.filter(b => b.status === "Pending").length,
      confirmed: all.filter(b => b.status === "Confirmed").length,
      cancelled: all.filter(b => b.status === "Cancelled").length,
      revenue: all.filter(b => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0),
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...(bookings || [])]
      .filter(b => {
        const matchTab = tab === "All" || b.status === tab;
        const customer = usersMap[b.userId];
        const matchSearch = !q ||
          b.serviceName.toLowerCase().includes(q) ||
          b.branchName.toLowerCase().includes(q) ||
          (customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(q) : false);
        return matchTab && matchSearch;
      })
      .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime());
  }, [bookings, tab, search, usersMap]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<BookingEditForm>({
    resolver: zodResolver(bookingEditSchema),
  });

  function openEdit(b: WithId<Booking>) {
    setEditBooking(b);
    reset({ status: b.status, cost: b.cost || 0, notes: b.notes || "", assignedStaffName: b.assignedStaffName || "" });
  }

  async function handleSaveBooking(data: BookingEditForm) {
    if (!editBooking) return;
    setIsSubmitting(true);
    try {
      await safeUpdateDoc(doc(firestore, "bookings", editBooking.id), {
        status: data.status,
        cost: data.cost,
        notes: data.notes || null,
        assignedStaffName: data.assignedStaffName || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Booking updated", description: `Status set to ${data.status}.` });
      setEditBooking(null);
    } catch {
      toast({ title: "Error", description: "Could not update booking.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBooking() {
    if (!deleteBooking) return;
    try {
      await safeDeleteDoc(doc(firestore, "bookings", deleteBooking.id));
      toast({ title: "Booking deleted", variant: "destructive" });
      setDeleteBooking(null);
    } catch {
      toast({ title: "Error", description: "Could not delete booking.", variant: "destructive" });
    }
  }

  const tabs: { label: string; value: TabStatus; count: number }[] = [
    { label: "All", value: "All", count: stats.total },
    { label: "Pending", value: "Pending", count: stats.pending },
    { label: "Confirmed", value: "Confirmed", count: stats.confirmed },
    { label: "Completed", value: "Completed", count: stats.completed },
    { label: "Cancelled", value: "Cancelled", count: stats.cancelled },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Operations"
        icon={<CalendarCheck className="h-3.5 w-3.5" />}
        title="Bookings"
        description={
          loadingBookings
            ? "Loading bookings…"
            : `${stats.total} total bookings across all vendors on the platform.`
        }
      />

      {/* KPI row */}
      <StatCardGrid>
        {[
          { label: "Total", value: stats.total, icon: CalendarCheck, accent: "bg-primary/10 text-primary" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, accent: "bg-emerald-500/10 text-emerald-600" },
          { label: "Pending", value: stats.pending, icon: Clock, accent: "bg-amber-500/10 text-amber-600" },
          { label: "Revenue", value: `QAR ${stats.revenue.toLocaleString()}`, icon: CircleDollarSign, accent: "bg-emerald-500/10 text-emerald-600" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <StatCard
            key={label}
            label={label}
            value={loadingBookings ? "—" : value}
            icon={<Icon className="h-4 w-4" />}
            accent={accent}
          />
        ))}
      </StatCardGrid>

      {/* Table card */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-bold">All Bookings</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search service, vendor, customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl h-9" />
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabStatus)}>
            <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-muted/50 p-1">
              {tabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="rounded-xl px-3 py-1.5 text-xs">
                  {t.label}
                  <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-background/80 px-1 text-[10px] font-bold">{t.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {loadingBookings ? (
            <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<CalendarCheck className="h-8 w-8" />}
                title="No bookings found"
                description={
                  search || tab !== "All"
                    ? "No bookings match your current search and filters."
                    : "Bookings placed by customers will appear here."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold">Service</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Customer</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Vendor</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Date</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Cost</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => {
                    const customer = usersMap[b.userId];
                    return (
                      <TableRow key={b.id} className="border-border/60 hover:bg-muted/30">
                        <TableCell className="pl-6">
                          <p className="font-bold text-sm">{b.serviceName}</p>
                          {b.assignedStaffName && <p className="text-xs text-muted-foreground">Staff: {b.assignedStaffName}</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm font-semibold">{customer ? `${customer.firstName} ${customer.lastName}` : "—"}</p>
                          <p className="text-xs text-muted-foreground">{b.userId.slice(0, 8)}…</p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{b.branchName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {format(toDate(b.bookingDate), "MMM d, yyyy")}
                          <span className="block text-[11px]">{format(toDate(b.bookingDate), "h:mm a")}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-bold text-sm text-emerald-600">{b.cost ? `QAR ${b.cost.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => setViewBooking(b)}><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteBooking(b)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editBooking} onOpenChange={o => !o && setEditBooking(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>{editBooking?.serviceName} · {editBooking?.branchName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSaveBooking)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {(editBooking ? [editBooking.status, ...BOOKING_TRANSITIONS[editBooking.status]] : [...BOOKING_STATUSES]).map(s => (
                      <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cost (QAR)</Label>
              <Input type="number" step="0.01" {...register("cost")} className="rounded-xl" />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Assigned Staff Name</Label>
              <Input {...register("assignedStaffName")} className="rounded-xl" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...register("notes")} className="rounded-xl resize-none" rows={3} placeholder="Internal notes…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBooking(null)} disabled={isSubmitting} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteBooking} onOpenChange={o => !o && setDeleteBooking(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>Permanently removes <strong>{deleteBooking?.serviceName}</strong> at <strong>{deleteBooking?.branchName}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBooking} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View detail sheet */}
      <Sheet open={!!viewBooking} onOpenChange={o => !o && setViewBooking(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{viewBooking?.serviceName}</SheetTitle>
            <SheetDescription>{viewBooking?.branchName}</SheetDescription>
          </SheetHeader>
          {viewBooking && (
            <div className="space-y-5">
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                {[
                  { label: "Status", value: <StatusBadge status={viewBooking.status} /> },
                  { label: "Date", value: format(toDate(viewBooking.bookingDate), "MMM d, yyyy · h:mm a") },
                  { label: "Cost", value: viewBooking.cost ? `QAR ${viewBooking.cost.toLocaleString()}` : "—" },
                  { label: "Customer UID", value: viewBooking.userId.slice(0, 16) + "…" },
                  { label: "Vendor", value: viewBooking.branchName },
                  { label: "Assigned Staff", value: viewBooking.assignedStaffName || "—" },
                  { label: "Notes", value: viewBooking.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground font-medium shrink-0">{row.label}</span>
                    <span className="font-semibold text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              {viewBooking.partsUsed && viewBooking.partsUsed.length > 0 && (
                <div>
                  <p className="section-label mb-3 flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Parts Used</p>
                  <div className="space-y-2">
                    {viewBooking.partsUsed.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3 text-sm">
                        <span className="font-semibold">{p.name}</span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>×{p.qty}</span>
                          <span className="font-bold text-foreground">QAR {p.unitPrice}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl bg-muted/50 p-3 text-sm font-bold">
                      <span>Parts Total</span>
                      <span>QAR {viewBooking.partsUsed.reduce((s, p) => s + p.qty * p.unitPrice, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
