'use client';

import Link from "next/link";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { collection, query, Timestamp, where } from "firebase/firestore";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { AIBusinessInsights } from "@/components/vendor/ai-business-insights";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import type { Booking, WithId } from "@/lib/types";

const OverviewChart = dynamic(() => import("@/components/vendor/overview-chart").then(m => m.OverviewChart), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> });

function toDate(value: Booking["bookingDate"]) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentLine: string;
  glow: string;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, accentLine, glow }: KpiCardProps) {
  return (
    <div className={`group bento-card p-5 ${glow}`}>
      <div className={`card-accent-top bg-gradient-to-r ${accentLine}`} />
      <div aria-hidden className={`ambient-blob -right-4 -top-4 h-16 w-16 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${iconBg}`} />

      <div className="relative flex items-start justify-between gap-3">
        <p className="section-label">{label}</p>
        <div className={`icon-pill h-10 w-10 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>

      <p className="relative metric-number mt-4">{value}</p>

      <div className="relative mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <TrendingUp className={`h-3.5 w-3.5 ${iconColor}`} />
        <span>Live data</span>
      </div>
    </div>
  );
}

function UpcomingBooking({ booking }: { booking: WithId<Booking> }) {
  const date = toDate(booking.bookingDate);

  return (
    <Link
      href="/vendor/dashboard/bookings"
      className="group flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 transition-all duration-300 hover:border-primary/40 hover:bg-background hover:shadow-sm"
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-sm">{booking.serviceName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.customerName || "Customer"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{format(date, "h:mm a")}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary border-primary/20">
          {format(date, "MMM d")}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

export default function VendorDashboard() {
  const { firestore } = useFirebase();
  const { business, activeBranch, canSeeAllBranches } = useVendor();

  const bookingsQuery = useMemoFirebase(
    () =>
      canSeeAllBranches
        ? query(collection(firestore, "bookings"), where("businessId", "==", business.id))
        : activeBranch
        ? query(collection(firestore, "bookings"), where("branchId", "==", activeBranch.id))
        : null,
    [firestore, business, activeBranch, canSeeAllBranches]
  );
  const { data: bookings, isLoading } = useCollection<WithId<Booking>>(bookingsQuery);

  const upcomingBookings = bookings
    ?.filter((b) => b.status === "Confirmed" && toDate(b.bookingDate) >= new Date())
    .sort((a, b) => toDate(a.bookingDate).getTime() - toDate(b.bookingDate).getTime())
    .slice(0, 5) || [];

  const totalRevenue = bookings?.filter((b) => b.status === "Completed").reduce((sum, b) => sum + (b.cost || 0), 0) || 0;
  const completedJobs = bookings?.filter((b) => b.status === "Completed").length || 0;
  const pendingJobs = bookings?.filter((b) => b.status === "Pending").length || 0;
  const uniqueCustomers = useMemo(
    () => [...new Set((bookings || []).map((b) => b.userId))].length,
    [bookings]
  );

  const kpiCards: KpiCardProps[] = [
    {
      label: "Revenue",
      value: `QAR ${totalRevenue.toLocaleString()}`,
      icon: CircleDollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      accentLine: "from-emerald-500 via-teal-400 to-transparent",
      glow: "hover:bg-emerald-500/[0.02]",
    },
    {
      label: "Completed Jobs",
      value: completedJobs,
      icon: Wrench,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      accentLine: "from-primary via-sky-400 to-transparent",
      glow: "hover:bg-primary/[0.02]",
    },
    {
      label: "Customers",
      value: uniqueCustomers,
      icon: Users,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      accentLine: "from-violet-500 via-indigo-400 to-transparent",
      glow: "hover:bg-violet-500/[0.02]",
    },
    {
      label: "Reviews",
      value: activeBranch?.reviewCount || 0,
      icon: Star,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      accentLine: "from-amber-500 via-orange-400 to-transparent",
      glow: "hover:bg-amber-500/[0.02]",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/6 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Left */}
          <div>
            <Badge
              variant="outline"
              className="mb-5 h-8 gap-2 border-primary/20 bg-gradient-to-r from-primary/10 to-emerald-500/8 px-3"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary animate-glow-breathe" />
              <span className="text-xs font-semibold text-primary">2026 vendor workspace</span>
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Run your workshop from one{" "}
              <span className="text-gradient-emerald">command center.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track jobs, revenue, customers, services, inventory, and reviews for{" "}
              <span className="font-semibold text-foreground">{business.displayName || "your garage"}</span>.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="justify-start shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                <Link href="/vendor/dashboard/bookings">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Manage Bookings
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="justify-start hover:border-primary/40 hover:bg-primary/5">
                <Link href="/vendor/dashboard/services">
                  <Wrench className="mr-2 h-4 w-4" />
                  Update Services
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Status pills */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: "Approval",
                value: activeBranch?.status || "Pending",
                dotColor: activeBranch?.status === "Approved" ? "bg-emerald-500" : "bg-amber-500",
                valueColor: activeBranch?.status === "Approved" ? "text-emerald-600" : "text-amber-600",
              },
              {
                label: "Open Jobs",
                value: upcomingBookings.length + pendingJobs,
                dotColor: "bg-primary",
                valueColor: "text-primary",
              },
              {
                label: "Rating",
                value: `${(activeBranch?.rating || 0).toFixed(1)} / 5`,
                dotColor: "bg-amber-500",
                valueColor: "text-amber-600",
              },
            ].map((pill) => (
              <div
                key={pill.label}
                className="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-background hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${pill.dotColor}`} />
                  <p className="section-label">{pill.label}</p>
                </div>
                <p className={`mt-3 text-2xl font-bold tracking-tight ${pill.valueColor}`}>{pill.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}
      </section>

      {/* ── Revenue Chart + Sidebar widgets ───────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Revenue pulse</CardTitle>
              <Badge variant="outline" className="bg-emerald-500/8 text-emerald-600 border-emerald-500/20 text-[11px]">
                Last 6 months
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <OverviewChart timeRange="last_6_months" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {bookings && <AIBusinessInsights business={business} bookings={bookings} />}

          <OnboardingChecklist
            title="Vendor setup"
            items={[
              { label: "Complete workshop settings", href: "/vendor/dashboard/settings", done: !!activeBranch?.address },
              { label: "Add services and pricing", href: "/vendor/dashboard/services" },
              { label: "Add stock items", href: "/vendor/dashboard/inventory" },
              { label: "Review booking pipeline", href: "/vendor/dashboard/bookings", done: (bookings?.length || 0) > 0 },
            ]}
          />

          {/* Upcoming appointments */}
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold">Next appointments</CardTitle>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                <Link href="/vendor/dashboard/bookings">
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </>
              ) : upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <UpcomingBooking key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No upcoming appointments yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
