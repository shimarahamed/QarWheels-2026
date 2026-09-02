'use client';

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import {
  ArrowLeft, Building2, CalendarCheck, CheckCircle2,
  CircleDollarSign, Clock, Edit, FileText, Loader2,
  MapPin, Package, Percent, Phone, PlusCircle, Search,
  Star, Trash2, Users, Wrench, XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCollection, useDoc, useFirebase, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_TRANSITIONS } from "@/lib/types";
import type { Booking, BookingStatus, Promotion, Service, UserProfile, Branch, WithId } from "@/lib/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDate(v: unknown) {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return new Date();
}

function statusBadgeClass(s: BookingStatus) {
  if (s === "Completed") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "Confirmed") return "bg-primary/10 text-primary border-primary/20";
  if (s === "Cancelled") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
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

// ─── schemas ─────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  price: z.coerce.number().min(0, "Must be ≥ 0"),
  duration: z.coerce.number().int("Must be a whole number").min(1, "Must be ≥ 1 min"),
});
type ServiceForm = z.infer<typeof serviceSchema>;

const bookingEditSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  cost: z.coerce.number().min(0),
  notes: z.string().optional(),
  assignedStaffName: z.string().optional(),
});
type BookingEditForm = z.infer<typeof bookingEditSchema>;

const promoSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
  discount: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  status: z.enum(["Active", "Scheduled", "Expired"]),
});
type PromoForm = z.infer<typeof promoSchema>;

// ─── sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, accent }: { label: string; value: string | number; icon: React.ElementType; iconBg: string; iconColor: string; accent: string }) {
  return (
    <div className="bento-card p-5">
      <div className={`card-accent-top bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="section-label">{label}</p>
        <div className={`icon-pill h-9 w-9 ${iconBg}`}><Icon className={`h-4 w-4 ${iconColor}`} /></div>
      </div>
      <p className="metric-number mt-3">{value}</p>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.vendorId as string;
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  // ── data refs — guard against undefined vendorId on first render
  const vendorRef = useMemoFirebase(() => vendorId ? doc(firestore, "branches", vendorId) : null, [firestore, vendorId]);
  const servicesRef = useMemoFirebase(() => vendorId ? query(collection(firestore, "branch_services"), where("branchId", "==", vendorId)) : null, [firestore, vendorId]);
  const promotionsRef = useMemoFirebase(() => vendorId ? query(collection(firestore, "branch_promotions"), where("branchIds", "array-contains", vendorId)) : null, [firestore, vendorId]);
  const bookingsQuery = useMemoFirebase(() => vendorId ? query(collection(firestore, "bookings"), where("branchId", "==", vendorId)) : null, [firestore, vendorId]);
  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);

  const { data: vendor, isLoading: loadingVendor } = useDoc<Branch>(vendorRef);
  const { data: services, isLoading: loadingServices, error: servicesError } = useCollection<WithId<Service>>(servicesRef);
  const { data: promotions, isLoading: loadingPromos } = useCollection<WithId<Promotion>>(promotionsRef);
  const { data: bookings, isLoading: loadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);
  const { data: users } = useCollection<WithId<UserProfile>>(usersQuery, { suppressPermissionError: true });

  const usersMap = useMemo(() => {
    const m: Record<string, WithId<UserProfile>> = {};
    for (const u of users || []) m[u.id] = u;
    return m;
  }, [users]);

  const stats = useMemo(() => {
    const all = bookings || [];
    return {
      total: all.length,
      completed: all.filter(b => b.status === "Completed").length,
      revenue: all.filter(b => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0),
      pending: all.filter(b => b.status === "Pending").length,
      uniqueCustomers: new Set(all.map(b => b.userId)).size,
    };
  }, [bookings]);

  // ── Services CRUD state
  const [editService, setEditService] = useState<WithId<Service> | null>(null);
  const [deleteService, setDeleteService] = useState<WithId<Service> | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const serviceForm = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema) });

  function openServiceCreate() {
    setEditService(null);
    serviceForm.reset({ name: "", description: "", price: 0, duration: 30 });
    setShowServiceForm(true);
  }
  function openServiceEdit(s: WithId<Service>) {
    setEditService(s);
    serviceForm.reset({ name: s.name, description: s.description, price: s.price, duration: s.duration });
    setShowServiceForm(true);
  }
  async function handleSaveService(data: ServiceForm) {
    if (!servicesRef) return;
    setServiceSubmitting(true);
    try {
      if (editService) {
        await safeUpdateDoc(doc(firestore, "branch_services", editService.id), data);
        toast({ title: "Service updated" });
      } else {
        await safeAddDoc(collection(firestore, "branch_services"), {
          ...data,
          businessId: vendor?.businessId ?? "",
          branchId: vendorId,
          active: true,
        });
        toast({ title: "Service created" });
      }
      setShowServiceForm(false); setEditService(null);
    } catch { toast({ title: "Error", description: "Could not save service.", variant: "destructive" }); }
    finally { setServiceSubmitting(false); }
  }
  async function handleDeleteService() {
    if (!deleteService) return;
    await safeDeleteDoc(doc(firestore, "branch_services", deleteService.id));
    toast({ title: "Service deleted", variant: "destructive" });
    setDeleteService(null);
  }

  // ── Booking CRUD state
  const [editBooking, setEditBooking] = useState<WithId<Booking> | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<WithId<Booking> | null>(null);
  const [viewBooking, setViewBooking] = useState<WithId<Booking> | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");

  const bookingForm = useForm<BookingEditForm>({ resolver: zodResolver(bookingEditSchema) });

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.toLowerCase();
    return [...(bookings || [])]
      .filter(b => !q || b.serviceName.toLowerCase().includes(q))
      .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime());
  }, [bookings, bookingSearch]);

  function openBookingEdit(b: WithId<Booking>) {
    setEditBooking(b);
    bookingForm.reset({ status: b.status, cost: b.cost || 0, notes: b.notes || "", assignedStaffName: b.assignedStaffName || "" });
  }
  async function handleSaveBooking(data: BookingEditForm) {
    if (!editBooking) return;
    setBookingSubmitting(true);
    try {
      await safeUpdateDoc(doc(firestore, "bookings", editBooking.id), { ...data, updatedAt: serverTimestamp() });
      toast({ title: "Booking updated" });
      setEditBooking(null);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setBookingSubmitting(false); }
  }
  async function handleDeleteBooking() {
    if (!deleteBooking) return;
    await safeDeleteDoc(doc(firestore, "bookings", deleteBooking.id));
    toast({ title: "Booking deleted", variant: "destructive" });
    setDeleteBooking(null);
  }

  // ── Promotions CRUD state
  const [editPromo, setEditPromo] = useState<WithId<Promotion> | null>(null);
  const [deletePromo, setDeletePromo] = useState<WithId<Promotion> | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  const promoForm = useForm<PromoForm>({ resolver: zodResolver(promoSchema), defaultValues: { status: "Scheduled" } });

  function openPromoCreate() {
    setEditPromo(null);
    promoForm.reset({ title: "", description: "", code: "", discount: "", startDate: "", endDate: "", status: "Scheduled" });
    setShowPromoForm(true);
  }
  function openPromoEdit(p: WithId<Promotion>) {
    setEditPromo(p);
    try {
      promoForm.reset({ ...p, startDate: format(new Date(p.startDate), "yyyy-MM-dd"), endDate: format(new Date(p.endDate), "yyyy-MM-dd") });
    } catch { promoForm.reset({ ...p }); }
    setShowPromoForm(true);
  }
  async function handleSavePromo(data: PromoForm) {
    if (!editPromo && !promotionsRef) return;
    setPromoSubmitting(true);
    const payload = { ...data, startDate: new Date(data.startDate).toISOString(), endDate: new Date(data.endDate).toISOString() };
    try {
      if (editPromo) {
        await safeUpdateDoc(doc(firestore, "branch_promotions", editPromo.id), payload);
        toast({ title: "Promotion updated" });
      } else if (promotionsRef) {
        await safeAddDoc(collection(firestore, "branch_promotions"), {
          ...payload,
          businessId: vendor?.businessId ?? "",
          branchIds: [vendorId],
        });
        toast({ title: "Promotion created" });
      }
      setShowPromoForm(false); setEditPromo(null);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setPromoSubmitting(false); }
  }
  async function handleDeletePromo() {
    if (!deletePromo) return;
    await safeDeleteDoc(doc(firestore, "branch_promotions", deletePromo.id));
    toast({ title: "Promotion deleted", variant: "destructive" });
    setDeletePromo(null);
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (loadingVendor) {
    return (
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Vendor not found.</p>
        <Button asChild variant="outline" className="rounded-xl"><Link href="/admin/dashboard/vendors"><ArrowLeft className="mr-2 h-4 w-4" />Back to Vendors</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl h-9 px-3 hover:bg-muted/70">
          <Link href="/admin/dashboard/vendors"><ArrowLeft className="mr-2 h-4 w-4" />Vendors</Link>
        </Button>
      </div>

      {/* Vendor hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/6 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="icon-pill h-14 w-14 bg-emerald-500/10 text-emerald-600 shrink-0"><Building2 className="h-7 w-7" /></span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{vendor.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{vendor.city}, {vendor.country}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{vendor.address}, {vendor.city}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{vendor.phoneNumber}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {vendor.status === "Approved"
              ? <Badge className="bg-emerald-500 hover:bg-emerald-500">Approved</Badge>
              : vendor.status === "Rejected"
              ? <Badge className="bg-destructive hover:bg-destructive">Rejected</Badge>
              : <Badge className="bg-amber-500 hover:bg-amber-500">Pending</Badge>}
          </div>
        </div>
        {vendor.tags && vendor.tags.length > 0 && <p className="relative mt-4 text-sm text-muted-foreground border-t border-border/60 pt-4">{vendor.tags.join(' · ')}</p>}
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Bookings" value={stats.total} icon={CalendarCheck} iconBg="bg-primary/10" iconColor="text-primary" accent="from-primary via-sky-400 to-transparent" />
        <KpiCard label="Completed" value={stats.completed} icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" accent="from-emerald-500 via-teal-400 to-transparent" />
        <KpiCard label="Revenue" value={`QAR ${stats.revenue.toLocaleString()}`} icon={CircleDollarSign} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" accent="from-emerald-500 via-teal-400 to-transparent" />
        <KpiCard label="Customers" value={stats.uniqueCustomers} icon={Users} iconBg="bg-violet-500/10" iconColor="text-violet-600" accent="from-violet-500 via-indigo-400 to-transparent" />
        <KpiCard label="Rating" value={`${(vendor.rating || 0).toFixed(1)} / 5`} icon={Star} iconBg="bg-amber-500/10" iconColor="text-amber-600" accent="from-amber-500 via-orange-400 to-transparent" />
      </div>

      {/* Tabbed sections */}
      <Tabs defaultValue="services">
        <TabsList className="h-auto gap-1 rounded-2xl bg-muted/50 p-1 flex-wrap">
          <TabsTrigger value="services" className="rounded-xl px-4 py-2 text-xs gap-1.5"><Wrench className="h-3.5 w-3.5" />Services ({services?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-xl px-4 py-2 text-xs gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Bookings ({bookings?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="promotions" className="rounded-xl px-4 py-2 text-xs gap-1.5"><Percent className="h-3.5 w-3.5" />Promotions ({promotions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-xl px-4 py-2 text-xs gap-1.5"><FileText className="h-3.5 w-3.5" />Invoices</TabsTrigger>
        </TabsList>

        {/* ── SERVICES tab ─────────────────────────────────────────────────── */}
        <TabsContent value="services" className="mt-5">
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Services & Pricing</CardTitle>
              <Button size="sm" className="rounded-xl h-8 text-xs" onClick={openServiceCreate}><PlusCircle className="mr-1.5 h-3.5 w-3.5" />Add Service</Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingServices ? (
                <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
              ) : servicesError ? (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <XCircle className="h-10 w-10 text-destructive/50" />
                  <p className="text-sm text-destructive">Failed to load services: {servicesError.message}</p>
                </div>
              ) : !services || services.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-10 text-center">
                  <Wrench className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No services added yet</p>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={openServiceCreate}><PlusCircle className="mr-1.5 h-3.5 w-3.5" />Add first service</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="pl-6 font-semibold">Service</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Duration</TableHead>
                        <TableHead className="font-semibold">Price (QAR)</TableHead>
                        <TableHead className="font-semibold text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map(s => (
                        <TableRow key={s.id} className="border-border/60 hover:bg-muted/30">
                          <TableCell className="pl-6 font-bold text-sm">{s.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{s.description}</TableCell>
                          <TableCell className="text-sm">{s.duration} min</TableCell>
                          <TableCell className="font-bold text-sm text-emerald-600">QAR {s.price.toLocaleString()}</TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => openServiceEdit(s)}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteService(s)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BOOKINGS tab ─────────────────────────────────────────────────── */}
        <TabsContent value="bookings" className="mt-5">
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base font-bold">Bookings</CardTitle>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search service…" value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} className="pl-9 rounded-xl h-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingBookings ? (
                <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-10 text-center"><CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">No bookings yet</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="pl-6 font-semibold">Service</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Cost</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map(b => {
                        const customer = usersMap[b.userId];
                        return (
                          <TableRow key={b.id} className="border-border/60 hover:bg-muted/30">
                            <TableCell className="pl-6 font-bold text-sm">{b.serviceName}</TableCell>
                            <TableCell className="text-sm">{customer ? `${customer.firstName} ${customer.lastName}` : b.userId.slice(0, 8) + "…"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(toDate(b.bookingDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="font-bold text-sm text-emerald-600">{b.cost ? `QAR ${b.cost.toLocaleString()}` : "—"}</TableCell>
                            <TableCell><Badge variant="outline" className={`text-[11px] ${statusBadgeClass(b.status)}`}>{b.status}</Badge></TableCell>
                            <TableCell className="pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 rounded-xl px-2.5 text-xs hover:bg-primary/5 hover:text-primary" onClick={() => setViewBooking(b)}>View</Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 hover:text-primary" onClick={() => openBookingEdit(b)}><Edit className="h-4 w-4" /></Button>
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
        </TabsContent>

        {/* ── PROMOTIONS tab ───────────────────────────────────────────────── */}
        <TabsContent value="promotions" className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{promotions?.length ?? 0} campaigns — synced live to Firestore</p>
            <Button size="sm" className="rounded-xl h-8 text-xs" onClick={openPromoCreate}><PlusCircle className="mr-1.5 h-3.5 w-3.5" />New Campaign</Button>
          </div>
          {loadingPromos ? (
            <div className="grid gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
          ) : !promotions || promotions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-12 text-center">
              <Percent className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No promotions yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {promotions.map(p => (
                <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-bold text-sm">{p.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl border bg-rose-500/5 p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Discount</p>
                      <p className="text-sm font-bold text-rose-600">{p.discount}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Code</p>
                      <p className="text-xs font-mono font-bold">{p.code}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{p.description}</p>
                  <div className="flex gap-2 border-t border-border/60 pt-3">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs" onClick={() => openPromoEdit(p)}><Edit className="mr-1 h-3.5 w-3.5" />Edit</Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs hover:border-destructive/40 hover:text-destructive" onClick={() => setDeletePromo(p)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── INVOICES tab ─────────────────────────────────────────────────── */}
        <TabsContent value="invoices" className="mt-5">
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Completed Booking Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingBookings ? (
                <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
              ) : (bookings || []).filter(b => b.status === "Completed").length === 0 ? (
                <div className="p-10 text-center"><FileText className="mx-auto h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">No completed bookings yet</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="pl-6 font-semibold">#</TableHead>
                        <TableHead className="font-semibold">Service</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Parts</TableHead>
                        <TableHead className="font-semibold">Total (QAR)</TableHead>
                        <TableHead className="font-semibold">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(bookings || [])
                        .filter(b => b.status === "Completed")
                        .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime())
                        .map((b, idx) => {
                          const customer = usersMap[b.userId];
                          const partsTotal = (b.partsUsed || []).reduce((s, p) => s + p.qty * p.unitPrice, 0);
                          return (
                            <TableRow key={b.id} className="border-border/60 hover:bg-muted/30">
                              <TableCell className="pl-6 text-muted-foreground text-sm font-mono">#{String(idx + 1).padStart(3, "0")}</TableCell>
                              <TableCell className="font-bold text-sm">{b.serviceName}</TableCell>
                              <TableCell className="text-sm">{customer ? `${customer.firstName} ${customer.lastName}` : "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{format(toDate(b.bookingDate), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                {b.partsUsed && b.partsUsed.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {b.partsUsed.map((p, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] rounded-lg"><Package className="mr-1 h-2.5 w-2.5" />{p.name} ×{p.qty}</Badge>
                                    ))}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-bold text-sm text-emerald-600">QAR {(b.cost || 0).toLocaleString()}</p>
                                  {partsTotal > 0 && <p className="text-[11px] text-muted-foreground">Parts: QAR {partsTotal}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{b.notes || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  {/* Totals footer */}
                  <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-4">
                    <p className="text-sm font-semibold text-muted-foreground">{(bookings || []).filter(b => b.status === "Completed").length} completed bookings</p>
                    <p className="text-base font-bold">Total Revenue: <span className="text-emerald-600">QAR {stats.revenue.toLocaleString()}</span></p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── SERVICE DIALOGS ─────────────────────────────────────────────────── */}
      <Dialog open={showServiceForm} onOpenChange={o => { if (!o) { setShowServiceForm(false); setEditService(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editService ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>{editService ? `Editing "${editService.name}"` : "Add a new service to this vendor."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={serviceForm.handleSubmit(handleSaveService)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input {...serviceForm.register("name")} className="rounded-xl" />
              {serviceForm.formState.errors.name && <p className="text-xs text-destructive">{serviceForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...serviceForm.register("description")} className="rounded-xl resize-none" rows={2} />
              {serviceForm.formState.errors.description && <p className="text-xs text-destructive">{serviceForm.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (QAR)</Label>
                <Input type="number" step="0.01" {...serviceForm.register("price")} className="rounded-xl" />
                {serviceForm.formState.errors.price && <p className="text-xs text-destructive">{serviceForm.formState.errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" {...serviceForm.register("duration")} className="rounded-xl" />
                {serviceForm.formState.errors.duration && <p className="text-xs text-destructive">{serviceForm.formState.errors.duration.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowServiceForm(false); setEditService(null); }} disabled={serviceSubmitting}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={serviceSubmitting}>
                {serviceSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editService ? "Save Changes" : "Add Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteService} onOpenChange={o => !o && setDeleteService(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Delete service?</AlertDialogTitle><AlertDialogDescription>Permanently removes <strong>{deleteService?.name}</strong>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── BOOKING DIALOGS ─────────────────────────────────────────────────── */}
      <Dialog open={!!editBooking} onOpenChange={o => !o && setEditBooking(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>{editBooking?.serviceName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={bookingForm.handleSubmit(handleSaveBooking)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={bookingForm.control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {(editBooking ? [editBooking.status, ...BOOKING_TRANSITIONS[editBooking.status]] : [...BOOKING_STATUSES]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Cost (QAR)</Label>
              <Input type="number" step="0.01" {...bookingForm.register("cost")} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Assigned Staff</Label>
              <Input {...bookingForm.register("assignedStaffName")} className="rounded-xl" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...bookingForm.register("notes")} className="rounded-xl resize-none" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditBooking(null)} disabled={bookingSubmitting}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={bookingSubmitting}>
                {bookingSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBooking} onOpenChange={o => !o && setDeleteBooking(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Delete booking?</AlertDialogTitle><AlertDialogDescription>Permanently removes <strong>{deleteBooking?.serviceName}</strong>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBooking} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!viewBooking} onOpenChange={o => !o && setViewBooking(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{viewBooking?.serviceName}</SheetTitle>
            <SheetDescription>{format(toDate(viewBooking?.bookingDate), "MMM d, yyyy · h:mm a")}</SheetDescription>
          </SheetHeader>
          {viewBooking && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-3">
                {[
                  { label: "Status", value: <Badge variant="outline" className={`text-[11px] ${statusBadgeClass(viewBooking.status)}`}>{viewBooking.status}</Badge> },
                  { label: "Cost", value: viewBooking.cost ? `QAR ${viewBooking.cost.toLocaleString()}` : "—" },
                  { label: "Staff", value: viewBooking.assignedStaffName || "—" },
                  { label: "Notes", value: viewBooking.notes || "—" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground font-medium">{row.label}</span>
                    <span className="font-semibold text-right">{row.value}</span>
                  </div>
                ))}
              </div>
              {viewBooking.partsUsed && viewBooking.partsUsed.length > 0 && (
                <div>
                  <p className="section-label mb-2">Parts used</p>
                  <div className="space-y-2">
                    {viewBooking.partsUsed.map((p, i) => (
                      <div key={i} className="flex justify-between rounded-xl border p-3 text-sm">
                        <span className="font-semibold">{p.name} ×{p.qty}</span>
                        <span className="font-bold text-emerald-600">QAR {p.unitPrice * p.qty}</span>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl bg-muted/50 p-3 text-sm font-bold">
                      <span>Parts Total</span>
                      <span>QAR {viewBooking.partsUsed.reduce((s, p) => s + p.qty * p.unitPrice, 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── PROMO DIALOGS ───────────────────────────────────────────────────── */}
      <Dialog open={showPromoForm} onOpenChange={o => { if (!o) { setShowPromoForm(false); setEditPromo(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editPromo ? "Edit Promotion" : "New Promotion"}</DialogTitle>
            <DialogDescription>Changes sync immediately to Firestore and are visible to customers.</DialogDescription>
          </DialogHeader>
          <form onSubmit={promoForm.handleSubmit(handleSavePromo)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...promoForm.register("title")} className="rounded-xl" />
              {promoForm.formState.errors.title && <p className="text-xs text-destructive">{promoForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...promoForm.register("description")} className="rounded-xl resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <Input {...promoForm.register("code")} className="rounded-xl font-mono uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input {...promoForm.register("discount")} className="rounded-xl" placeholder="20% or QAR 50" />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...promoForm.register("startDate")} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...promoForm.register("endDate")} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={promoForm.control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowPromoForm(false); setEditPromo(null); }} disabled={promoSubmitting}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={promoSubmitting}>
                {promoSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editPromo ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePromo} onOpenChange={o => !o && setDeletePromo(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Delete promotion?</AlertDialogTitle><AlertDialogDescription>Removes <strong>{deletePromo?.title}</strong> permanently.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePromo} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
