'use client';

import { useState, useMemo } from "react";
import { collection, doc, query, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import {
  ArrowRight, Building2, CheckCircle2, ChevronDown, Edit,
  Loader2, MapPin, Phone, PlusCircle, Search, Star, Trash2, XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCollection, useFirebase, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Booking, BranchStatus, WithId } from "@/lib/types";

// The full businesses/branches admin console is a later-phase rewrite. Until
// then this page administers branches (the approvable unit) through a local
// view type covering only the fields it reads and writes.
type AdminVendor = {
  name: string;
  type?: "Garage" | "Parts Store" | "Both";
  description?: string;
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
  email?: string;
  status: BranchStatus;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
};

type VendorStatus = BranchStatus;

function toDate(v: unknown) {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  return new Date();
}

function statusBadge(status: VendorStatus) {
  if (status === "Approved") return <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-200 inline-block" />Approved</Badge>;
  if (status === "Rejected") return <Badge className="bg-destructive text-[10px] hover:bg-destructive"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-200 inline-block" />Rejected</Badge>;
  return <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-200 inline-block" />Pending</Badge>;
}

const vendorSchema = z.object({
  name: z.string().min(2, "Name required"),
  type: z.enum(["Garage", "Parts Store", "Both"]),
  description: z.string().optional(),
  address: z.string().min(3, "Address required"),
  city: z.string().min(1, "City required"),
  country: z.string().min(1, "Country required"),
  phoneNumber: z.string().min(7, "Phone required"),
  email: z.string().email("Valid email required"),
  status: z.enum(["Pending Approval", "Approved", "Rejected"]),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});
type VendorForm = z.infer<typeof vendorSchema>;

type FilterStatus = "All" | VendorStatus;

export default function AdminVendorsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [editVendor, setEditVendor] = useState<WithId<AdminVendor> | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<WithId<AdminVendor> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorsQuery = useMemoFirebase(() => query(collection(firestore, "branches")), [firestore]);
  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const { data: vendors, isLoading: loadingVendors } = useCollection<WithId<AdminVendor>>(vendorsQuery);
  const { data: bookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const bookingsByVendor = useMemo(() => {
    const map: Record<string, number> = {};
    // Per-garage count keys on the branch, which is what this page lists.
    for (const b of bookings || []) map[b.branchId] = (map[b.branchId] || 0) + 1;
    return map;
  }, [bookings]);

  const counts = useMemo(() => ({
    all: vendors?.length ?? 0,
    approved: (vendors || []).filter(v => v.status === "Approved").length,
    pending: (vendors || []).filter(v => v.status === "Pending Approval").length,
    rejected: (vendors || []).filter(v => v.status === "Rejected").length,
  }), [vendors]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (vendors || []).filter(v => {
      const matchSearch = !q || v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === "All" || v.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [vendors, search, filterStatus]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { status: "Pending Approval", type: "Garage", city: "Doha", country: "Qatar", latitude: 25.2854, longitude: 51.5310 },
  });

  function openCreate() {
    setEditVendor(null);
    reset({ name: "", type: "Garage", description: "", address: "", city: "Doha", country: "Qatar", phoneNumber: "", email: "", status: "Pending Approval", latitude: 25.2854, longitude: 51.5310 });
    setShowCreate(true);
  }

  function openEdit(v: WithId<AdminVendor>) {
    setEditVendor(v);
    reset({ name: v.name, type: v.type, description: v.description || "", address: v.address, city: v.city, country: v.country, phoneNumber: v.phoneNumber, email: v.email, status: v.status, latitude: v.latitude, longitude: v.longitude });
    setShowCreate(true);
  }

  async function handleSave(data: VendorForm) {
    setIsSubmitting(true);
    try {
      if (editVendor) {
        await safeUpdateDoc(doc(firestore, "branches", editVendor.id), { ...data, updatedAt: serverTimestamp() });
        toast({ title: "Vendor updated", description: `${data.name} saved.` });
      } else {
        await safeAddDoc(collection(firestore, "branches"), {
          ...data,
          ownerId: "",
          rating: 0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Vendor created", description: `${data.name} added.` });
      }
      setShowCreate(false);
      setEditVendor(null);
    } catch {
      toast({ title: "Error", description: "Could not save vendor.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(vendorId: string, status: VendorStatus) {
    try {
      await safeUpdateDoc(doc(firestore, "branches", vendorId), { status, updatedAt: serverTimestamp() });
      toast({ title: `Vendor ${status}` });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteVendor) return;
    try {
      await safeDeleteDoc(doc(firestore, "branches", deleteVendor.id));
      toast({ title: "Vendor deleted", variant: "destructive" });
      setDeleteVendor(null);
    } catch {
      toast({ title: "Error", description: "Could not delete vendor.", variant: "destructive" });
    }
  }

  const filterButtons: { label: string; value: FilterStatus; count: number; color: string }[] = [
    { label: "All", value: "All", count: counts.all, color: "border-primary/30 bg-primary/5 text-primary" },
    { label: "Approved", value: "Approved", count: counts.approved, color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" },
    { label: "Pending", value: "Pending Approval", count: counts.pending, color: "border-amber-500/30 bg-amber-500/5 text-amber-600" },
    { label: "Rejected", value: "Rejected", count: counts.rejected, color: "border-destructive/30 bg-destructive/5 text-destructive" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">{loadingVendors ? "Loading…" : `${vendors?.length ?? 0} garages & stores`}</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" />Add Vendor
        </Button>
      </header>

      {/* KPI mini-cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.all, color: "text-primary" },
          { label: "Approved", value: counts.approved, color: "text-emerald-600" },
          { label: "Pending", value: counts.pending, color: "text-amber-600" },
          { label: "Rejected", value: counts.rejected, color: "text-destructive" },
        ].map(k => (
          <div key={k.label} className="bento-card p-4">
            <p className="section-label">{k.label}</p>
            <p className={`metric-number mt-2 ${k.color}`}>{loadingVendors ? "—" : k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(fb => (
            <Button key={fb.value} variant="outline" size="sm" onClick={() => setFilterStatus(fb.value)}
              className={`h-8 rounded-xl px-3 text-xs transition-colors ${filterStatus === fb.value ? fb.color + " border" : "hover:bg-muted/50"}`}>
              {fb.label}
              <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[10px]">{fb.count}</Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Vendor grid */}
      {loadingVendors ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No vendors match your filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(v => (
            <div key={v.id} className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md flex flex-col">
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="icon-pill h-10 w-10 shrink-0 bg-emerald-500/10 text-emerald-600"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(v.status)}
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{v.address}, {v.city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" /><span>{v.phoneNumber}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Bookings</p>
                  <p className="mt-1 text-sm font-bold text-primary">{bookingsByVendor[v.id] || 0}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Rating</p>
                  <p className="mt-1 text-sm font-bold text-amber-600 flex items-center justify-center gap-1"><Star className="h-3 w-3" />{(v.rating || 0).toFixed(1)}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Reviews</p>
                  <p className="mt-1 text-sm font-bold">{v.reviewCount || 0}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-border/60 pt-4 mt-auto">
                <Link href={`/admin/dashboard/vendors/${v.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full rounded-xl h-8 text-xs hover:border-primary/40 hover:text-primary">
                    <ArrowRight className="mr-1.5 h-3.5 w-3.5" />View Details
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="rounded-xl h-8 px-2.5 hover:border-primary/40 hover:text-primary" onClick={() => openEdit(v)}><Edit className="h-3.5 w-3.5" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-xl h-8 px-2.5"><ChevronDown className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl">
                    {v.status !== "Approved" && <DropdownMenuItem className="gap-2 rounded-xl text-emerald-600" onClick={() => handleStatusChange(v.id, "Approved")}><CheckCircle2 className="h-4 w-4" />Approve</DropdownMenuItem>}
                    {v.status !== "Rejected" && <DropdownMenuItem className="gap-2 rounded-xl text-destructive" onClick={() => handleStatusChange(v.id, "Rejected")}><XCircle className="h-4 w-4" />Reject</DropdownMenuItem>}
                    {v.status !== "Pending Approval" && <DropdownMenuItem className="gap-2 rounded-xl" onClick={() => handleStatusChange(v.id, "Pending Approval")}>Set Pending</DropdownMenuItem>}
                    <DropdownMenuItem className="gap-2 rounded-xl text-destructive" onClick={() => setDeleteVendor(v)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); setEditVendor(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
            <DialogDescription>{editVendor ? `Editing ${editVendor.name}` : "Create a new garage or parts store on the platform."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Business Name</Label>
                <Input {...register("name")} className="rounded-xl" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller control={control} name="type" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Garage">Garage</SelectItem>
                      <SelectItem value="Parts Store">Parts Store</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register("description")} className="rounded-xl resize-none" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} className="rounded-xl" />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...register("city")} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input {...register("country")} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phoneNumber")} className="rounded-xl" />
                {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} type="email" className="rounded-xl" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input {...register("latitude")} type="number" step="any" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input {...register("longitude")} type="number" step="any" className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowCreate(false); setEditVendor(null); }} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editVendor ? "Save Changes" : "Create Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteVendor} onOpenChange={o => !o && setDeleteVendor(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>Permanently removes <strong>{deleteVendor?.name}</strong> from the platform. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
