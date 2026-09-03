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
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import type { Booking, UserProfile, Branch, WithId } from "@/lib/types";

function toDate(value: Booking["bookingDate"]) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

type KpiSpec = {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  accent: string;
  href: string;
};

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

  const kpis: KpiSpec[] = [
    {
      label: "Total Users",
      value: users?.length ?? 0,
      hint: "Registered customers",
      icon: Users,
      accent: "bg-violet-500/10 text-violet-600",
      href: "/admin/dashboard/users",
    },
    {
      label: "Total Vendors",
      value: vendors?.length ?? 0,
      hint: `${stats.pendingVendors} pending approval`,
      icon: Building2,
      accent: "bg-emerald-500/10 text-emerald-600",
      href: "/admin/dashboard/businesses",
    },
    {
      label: "Total Bookings",
      value: bookings?.length ?? 0,
      hint: `${stats.completedBookings} completed`,
      icon: CalendarCheck,
      accent: "bg-amber-500/10 text-amber-600",
      href: "/admin/dashboard/bookings",
    },
    {
      label: "Platform Revenue",
      value: `QAR ${stats.totalRevenue.toLocaleString()}`,
      hint: "From completed jobs",
      icon: CircleDollarSign,
      accent: "bg-primary/10 text-primary",
      href: "/admin/dashboard/bookings",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="QarWheel Super Admin"
        icon={<Shield className="h-3.5 w-3.5" />}
        title="Platform command center"
        description="Real-time visibility across all users, vendors, bookings, and promotion campaigns on the QarWheel platform."
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="motion-press shadow-md shadow-primary/20">
              <Link href="/admin/dashboard/branches">
                <Building2 className="mr-2 h-4 w-4" />
                Review Branches
                {stats.pendingVendors > 0 && (
                  <Badge className="ml-2 bg-amber-500 text-[10px] hover:bg-amber-500">{stats.pendingVendors}</Badge>
                )}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="motion-press hover:border-primary/40 hover:bg-primary/5">
              <Link href="/admin/dashboard/bookings">
                <CalendarCheck className="mr-2 h-4 w-4" />
                View Bookings
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      {isLoading ? (
        <StatCardGrid>
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </StatCardGrid>
      ) : (
        <StatCardGrid>
          {kpis.map(({ label, value, hint, icon: Icon, accent, href }) => (
            <Link key={label} href={href} className="group motion-surface rounded-2xl">
              <StatCard
                label={label}
                value={value}
                icon={<Icon className="h-4 w-4" />}
                accent={accent}
                hint={
                  <span className="flex items-center justify-between gap-1.5">
                    {hint}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </span>
                }
              />
            </Link>
          ))}
        </StatCardGrid>
      )}

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
              <EmptyState
                icon={<CalendarCheck className="h-8 w-8" />}
                title="No bookings yet"
                description="Bookings placed by customers across every vendor will appear here."
              />
            ) : (
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="motion-surface flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{b.serviceName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.branchName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {format(toDate(b.bookingDate), "MMM d")}
                      </span>
                      <StatusBadge status={b.status} />
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
                <Link href="/admin/dashboard/branches">
                  All branches <ChevronRight className="ml-1 h-3.5 w-3.5" />
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
                      href="/admin/dashboard/branches"
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
                <div className="space-y-3">
                  {(["Completed", "Confirmed", "Pending", "Cancelled"] as const).map((status) => {
                    const count = (bookings || []).filter((b) => b.status === status).length;
                    const total = bookings?.length || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <StatusBadge status={status} />
                          <span className="tabular-nums text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: `var(--qw-status-${status.toLowerCase()}-dot)`,
                            }}
                          />
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
