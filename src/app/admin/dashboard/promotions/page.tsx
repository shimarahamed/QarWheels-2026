'use client';

import { useState, useMemo, useEffect } from "react";
import { collection, doc, getDocs, query, serverTimestamp } from "firebase/firestore";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import {
  Building2, CalendarRange, Edit, Loader2, Percent,
  PlusCircle, Search, Trash2, TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCollection, useFirebase, useMemoFirebase, safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Promotion, PromotionStatus, Branch, Booking, WithId } from "@/lib/types";

interface EnrichedPromotion extends Promotion {
  id: string;
  /** Branch this campaign is attached to (first entry of branchIds). */
  vendorId: string;
  vendorName: string;
  timesUsed: number;
}

const promoSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  code: z.string().min(1, "Code is required").toUpperCase(),
  discount: z.string().min(1, "Discount is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["Active", "Scheduled", "Expired"]),
});
type PromoForm = z.infer<typeof promoSchema>;

function computeStatus(promo: Promotion): PromotionStatus {
  const now = new Date();
  try {
    const start = parseISO(promo.startDate);
    const end = parseISO(promo.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return "Expired";
    if (now >= start) return "Active";
    return "Scheduled";
  } catch {
    return promo.status;
  }
}

function statusBadge(status: PromotionStatus) {
  if (status === "Active") return <Badge className="bg-emerald-500 text-[10px] hover:bg-emerald-500"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-200" />Active</Badge>;
  if (status === "Scheduled") return <Badge className="bg-primary text-[10px] hover:bg-primary"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-200" />Scheduled</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">Expired</Badge>;
}

type TabFilter = "All" | PromotionStatus;

export default function AdminPromotionsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("All");
  const [promos, setPromos] = useState<EnrichedPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPromo, setEditPromo] = useState<EnrichedPromotion | null>(null);
  const [deletePromo, setDeletePromo] = useState<EnrichedPromotion | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vendorsQuery = useMemoFirebase(() => query(collection(firestore, "branches")), [firestore]);
  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const { data: vendors } = useCollection<WithId<Branch>>(vendorsQuery);
  const { data: bookings } = useCollection<WithId<Booking>>(bookingsQuery);

  const usedCodes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings || []) {
      const code = (b as unknown as Record<string, string>).promotionCode;
      if (code) map[code] = (map[code] || 0) + 1;
    }
    return map;
  }, [bookings]);

  // Promotions are a single flat collection now, so one read replaces the old
  // per-vendor subcollection fan-out; branch names come from the branches list.
  async function fetchPromos() {
    setLoading(true);
    const branchNames = new Map((vendors || []).map((v) => [v.id, v.name]));
    try {
      const snap = await getDocs(collection(firestore, "branch_promotions"));
      const all: EnrichedPromotion[] = snap.docs.map((d) => {
        const data = d.data() as Promotion;
        const branchId = data.branchIds?.[0] ?? "";
        return {
          ...data,
          id: d.id,
          vendorId: branchId,
          vendorName: branchNames.get(branchId) ?? "All branches",
          timesUsed: usedCodes[data.code] || 0,
        };
      });
      setPromos(all);
    } catch {
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPromos(); }, [vendors, firestore, usedCodes]);

  const enriched = useMemo(() => promos.map(p => ({ ...p, computedStatus: computeStatus(p) })), [promos]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(p => {
      const matchTab = tab === "All" || p.computedStatus === tab;
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.vendorName.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [enriched, tab, search]);

  const counts = useMemo(() => ({
    all: enriched.length,
    active: enriched.filter(p => p.computedStatus === "Active").length,
    scheduled: enriched.filter(p => p.computedStatus === "Scheduled").length,
    expired: enriched.filter(p => p.computedStatus === "Expired").length,
  }), [enriched]);

  // Form
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PromoForm>({
    resolver: zodResolver(promoSchema),
    defaultValues: { status: "Scheduled" },
  });

  function openCreate() {
    setEditPromo(null);
    reset({ vendorId: "", title: "", description: "", code: "", discount: "", startDate: "", endDate: "", status: "Scheduled" });
    setShowCreate(true);
  }

  function openEdit(p: EnrichedPromotion) {
    setEditPromo(p);
    reset({
      vendorId: p.vendorId,
      title: p.title,
      description: p.description,
      code: p.code,
      discount: p.discount,
      startDate: p.startDate ? format(parseISO(p.startDate), "yyyy-MM-dd") : "",
      endDate: p.endDate ? format(parseISO(p.endDate), "yyyy-MM-dd") : "",
      status: p.status,
    });
    setShowCreate(true);
  }

  async function handleSave(data: PromoForm) {
    setIsSubmitting(true);
    // vendorId is the selected branch; the promotion doc stores it as an array.
    const { vendorId, ...promoFields } = data;
    const payload = {
      ...promoFields,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    };
    try {
      if (editPromo) {
        const ref = doc(firestore, "branch_promotions", editPromo.id);
        await safeUpdateDoc(ref, payload);
        toast({ title: "Promotion updated" });
      } else {
        const branch = (vendors || []).find((v) => v.id === vendorId);
        await safeAddDoc(collection(firestore, "branch_promotions"), {
          ...payload,
          businessId: branch?.businessId ?? "",
          branchIds: [vendorId],
        });
        toast({ title: "Promotion created" });
      }
      await fetchPromos();
      setShowCreate(false);
      setEditPromo(null);
    } catch {
      toast({ title: "Error", description: "Could not save promotion.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletePromo) return;
    try {
      await safeDeleteDoc(doc(firestore, "branch_promotions", deletePromo.id));
      toast({ title: "Promotion deleted", variant: "destructive" });
      await fetchPromos();
      setDeletePromo(null);
    } catch {
      toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
    }
  }

  const tabs: { label: string; value: TabFilter; count: number }[] = [
    { label: "All", value: "All", count: counts.all },
    { label: "Active", value: "Active", count: counts.active },
    { label: "Scheduled", value: "Scheduled", count: counts.scheduled },
    { label: "Expired", value: "Expired", count: counts.expired },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Promotions</h1>
          <p className="mt-1 text-sm text-muted-foreground">All vendor promotion campaigns — real-time Firestore sync</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" />New Campaign
        </Button>
      </header>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Campaigns", value: counts.all, icon: Percent, iconBg: "bg-rose-500/10", iconColor: "text-rose-600", accent: "from-rose-500 via-pink-400 to-transparent" },
          { label: "Active Now", value: counts.active, icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", accent: "from-emerald-500 via-teal-400 to-transparent" },
          { label: "Scheduled", value: counts.scheduled, icon: CalendarRange, iconBg: "bg-primary/10", iconColor: "text-primary", accent: "from-primary via-sky-400 to-transparent" },
          { label: "Vendors with Promos", value: [...new Set(promos.map(p => p.vendorId))].length, icon: Building2, iconBg: "bg-violet-500/10", iconColor: "text-violet-600", accent: "from-violet-500 via-indigo-400 to-transparent" },
        ].map(k => (
          <div key={k.label} className="bento-card p-5">
            <div className={`card-accent-top bg-gradient-to-r ${k.accent}`} />
            <div className="flex items-start justify-between gap-3">
              <p className="section-label">{k.label}</p>
              <div className={`icon-pill h-9 w-9 ${k.iconBg}`}><k.icon className={`h-4 w-4 ${k.iconColor}`} /></div>
            </div>
            <p className="metric-number mt-3">{loading ? "—" : k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search title, code, vendor…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-9" />
        </div>
        <Tabs value={tab} onValueChange={v => setTab(v as TabFilter)}>
          <TabsList className="h-auto gap-1 rounded-2xl bg-muted/50 p-1">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-xl px-3 py-1.5 text-xs">
                {t.label}
                <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-background/80 px-1 text-[10px] font-bold">{t.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <Percent className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No promotions found</p>
          <Button variant="outline" className="rounded-xl mt-2" onClick={openCreate}><PlusCircle className="mr-2 h-4 w-4" />Create first campaign</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <div key={`${p.vendorId}-${p.id}`} className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="icon-pill h-10 w-10 shrink-0 bg-rose-500/10 text-rose-600"><Percent className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.vendorName}</p>
                  </div>
                </div>
                {statusBadge(p.computedStatus)}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border bg-rose-500/5 border-rose-500/20 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Discount</p>
                  <p className="mt-1 text-sm font-bold text-rose-600">{p.discount}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Code</p>
                  <p className="mt-1 text-xs font-mono font-bold tracking-widest">{p.code}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Used</p>
                  <p className="mt-1 text-sm font-bold">{p.timesUsed}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                <span>{p.startDate ? format(parseISO(p.startDate), "MMM d, yyyy") : "—"} → {p.endDate ? format(parseISO(p.endDate), "MMM d, yyyy") : "—"}</span>
              </div>

              {p.description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}

              <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
                <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs hover:border-primary/40 hover:text-primary" onClick={() => openEdit(p)}>
                  <Edit className="mr-1.5 h-3.5 w-3.5" />Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs hover:border-destructive/40 hover:text-destructive" onClick={() => setDeletePromo(p)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); setEditPromo(null); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editPromo ? "Edit Promotion" : "New Promotion Campaign"}</DialogTitle>
            <DialogDescription>{editPromo ? `Editing "${editPromo.title}" for ${editPromo.vendorName}` : "Create a new campaign for any vendor. Changes sync immediately to Firestore."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4 pt-2">
            {!editPromo && (
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Controller control={control} name="vendorId" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vendor…" /></SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-60">
                      {(vendors || []).filter(v => v.status === "Approved").map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.vendorId && <p className="text-xs text-destructive">{errors.vendorId.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register("title")} className="rounded-xl" placeholder="e.g. Summer Oil Change Deal" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register("description")} className="rounded-xl resize-none" rows={2} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Promo Code</Label>
                <Input {...register("code")} className="rounded-xl font-mono uppercase" placeholder="SUMMER20" />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input {...register("discount")} className="rounded-xl" placeholder="20% or QAR 50" />
                {errors.discount && <p className="text-xs text-destructive">{errors.discount.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register("startDate")} className="rounded-xl" />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register("endDate")} className="rounded-xl" />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
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
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowCreate(false); setEditPromo(null); }} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editPromo ? "Save Changes" : "Create Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletePromo} onOpenChange={o => !o && setDeletePromo(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promotion?</AlertDialogTitle>
            <AlertDialogDescription>Permanently removes <strong>{deletePromo?.title}</strong> from <strong>{deletePromo?.vendorName}</strong>. This cannot be undone.</AlertDialogDescription>
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
