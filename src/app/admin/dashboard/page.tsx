'use client';

import Link from "next/link";
import { useMemo } from "react";
import { collection, query, Timestamp } from "firebase/firestore";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Percent,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import type { Booking, UserProfile, Branch, Promotion, WithId } from "@/lib/types";

function toDate(value: Booking["bookingDate"]) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentLine: string;
  href: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, accentLine, href }: KpiCardProps) {
  return (
    <Link href={href} className={`group bento-card p-5 hover:bg-primary/[0.01]`}>
      <div className={`card-accent-top bg-gradient-to-r ${accentLine}`} />
      <div aria-hidden className={`ambient-blob -right-4 -top-4 h-16 w-16 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${iconBg}`} />

      <div className="relative flex items-start justify-between gap-3">
        <p className="section-label">{label}</p>
        <div className={`icon-pill h-10 w-10 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>

      <p className="relative metric-number mt-4">{value}</p>

      <div className="relative mt-3 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <TrendingUp className={`h-3.5 w-3.5 ${iconColor}`} />
          <span>{sub || "Live data"}</span>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function statusColor(status: string) {
  if (status === "Completed") return "bg-emerald-500/8 text-emerald-600 border-emerald-500/20";
  if (status === "Confirmed") return "bg-primary/8 text-primary border-primary/20";
  if (status === "Cancelled") return "bg-destructive/8 text-destructive border-destructive/20";
  return "bg-amber-500/8 text-amber-600 border-amber-500/20";
}

function vendorStatusColor(status: string) {
  if (status === "Approved") return "bg-emerald-500 hover:bg-emerald-500";
  if (status === "Rejected") return "bg-destructive hover:bg-destructive";
  return "bg-amber-500 hover:bg-amber-500";
}

export default function AdminOverviewPage() {
  const { firestore } = useFirebase();

  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const vendorsQuery = useMemoFirebase(() => query(collection(firestore, "branches")), [firestore]);

  const { data: bookings, isLoading: loadingBookings } = useCollection<WithId<Booking>>(bookingsQuery);
  const { data: users, isLoading: loadingUsers } = useCollection<WithId<UserProfile>>(usersQuery);
  const { data: vendors, isLoading: loadingVendors } = useCollection<WithId<Branch>>(vendorsQuery);

  const isLoading = loadingBookings || loadingUsers || loadingVendors;

  const stats = useMemo(() => {
    const totalRevenue = (bookings || []).filter((b) => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0);
    const pendingVendors = (vendors || []).filter((v) => v.status === "Pending Approval").length;
    const activePromos = 0; // Will come from vendor subcollections — shown as link
    const completedBookings = (bookings || []).filter((b) => b.status === "Completed").length;
    return { totalRevenue, pendingVendors, activePromos, completedBookings };
  }, [bookings, vendors]);

  const recentBookings = useMemo(
    () =>
      [...(bookings || [])]
        .sort((a, b) => toDate(b.bookingDate).getTime() - toDate(a.bookingDate).getTime())
        .slice(0, 6),
    [bookings]
  );

  const pendingVendors = useMemo(
    () => (vendors || []).filter((v) => v.status === "Pending Approval").slice(0, 5),
    [vendors]
  );

  const kpis: KpiCardProps[] = [
    {
      label: "Total Users",
      value: users?.length ?? 0,
      icon: Users,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      accentLine: "from-violet-500 via-indigo-400 to-transparent",
      href: "/admin/dashboard/users",
    },
    {
      label: "Total Vendors",
      value: vendors?.length ?? 0,
      sub: `${stats.pendingVendors} pending approval`,
      icon: Building2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      accentLine: "from-emerald-500 via-teal-400 to-transparent",
      href: "/admin/dashboard/vendors",
    },
    {
      label: "Total Bookings",
      value: bookings?.length ?? 0,
      sub: `${stats.completedBookings} completed`,
      icon: CalendarCheck,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      accentLine: "from-amber-500 via-orange-400 to-transparent",
      href: "/admin/dashboard/bookings",
    },
    {
      label: "Platform Revenue",
      value: `QAR ${stats.totalRevenue.toLocaleString()}`,
      sub: "From completed jobs",
      icon: CircleDollarSign,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      accentLine: "from-primary via-sky-400 to-transparent",
      href: "/admin/dashboard/bookings",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/6 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative p-5 sm:p-7">
          <Badge
            variant="outline"
            className="mb-5 h-8 gap-2 border-rose-500/20 bg-gradient-to-r from-rose-500/10 to-primary/8 px-3"
          >
            <Shield className="h-3.5 w-3.5 text-rose-600 animate-glow-breathe" />
            <span className="text-xs font-semibold text-rose-600">QarWheel Super Admin</span>
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Platform <span className="text-gradient-blue">command center.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Real-time visibility across all users, vendors, bookings, and promotion campaigns on the QarWheel platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-md shadow-primary/20">
              <Link href="/admin/dashboard/vendors">
                <Building2 className="mr-2 h-4 w-4" />
                Review Vendors
                {stats.pendingVendors > 0 && (
                  <Badge className="ml-2 bg-amber-500 text-[10px]">{stats.pendingVendors}</Badge>
                )}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="hover:border-primary/40 hover:bg-primary/5">
              <Link href="/admin/dashboard/bookings">
                <CalendarCheck className="mr-2 h-4 w-4" />
                View Bookings
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : kpis.map((card) => <KpiCard key={card.label} {...card} />)}
      </section>

      {/* ── Two column ────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

        {/* Recent Bookings */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Recent Bookings</CardTitle>
            <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
              <Link href="/admin/dashboard/bookings">
                View all <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
              </div>
            ) : recentBookings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No bookings yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{b.serviceName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.branchName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {format(toDate(b.bookingDate), "MMM d")}
                      </span>
                      <Badge variant="outline" className={`text-[11px] ${statusColor(b.status)}`}>
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Pending Vendor Approvals */}
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Pending Approvals</CardTitle>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600">
                <Link href="/admin/dashboard/vendors">
                  All vendors <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingVendors ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}
                </div>
              ) : pendingVendors.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">No pending vendor approvals.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingVendors.map((v) => (
                    <Link
                      key={v.id}
                      href="/admin/dashboard/vendors"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/8"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{v.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{v.city}, {v.country}</p>
                      </div>
                      <Badge className="shrink-0 bg-amber-500 text-[10px] hover:bg-amber-500">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Booking Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-xl" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {(["Completed", "Confirmed", "Pending", "Cancelled"] as const).map((status) => {
                    const count = (bookings || []).filter((b) => b.status === status).length;
                    const total = bookings?.length || 1;
                    const pct = Math.round((count / total) * 100);
                    const barColor =
                      status === "Completed" ? "bg-emerald-500" :
                      status === "Confirmed" ? "bg-primary" :
                      status === "Pending" ? "bg-amber-500" : "bg-destructive";
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold">{status}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-fill ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promotions shortcut */}
          <Link
            href="/admin/dashboard/promotions"
            className="group flex items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 transition-all hover:border-rose-500/40 hover:bg-rose-500/8"
          >
            <span className="icon-pill h-11 w-11 bg-rose-500/10 text-rose-600">
              <Percent className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">Promotion Campaigns</p>
              <p className="text-xs text-muted-foreground mt-0.5">View all active & scheduled promotions</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-rose-600" />
          </Link>
        </div>
      </section>
    </div>
  );
}
