'use client';

import Link from "next/link";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { collection, query, Timestamp, where } from "firebase/firestore";
import { ArrowRight, ChevronRight } from "lucide-react";
import { MaterialIcon } from "@/components/ui/material-icon";
import { AIBusinessInsights } from "@/components/vendor/ai-business-insights";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { useVendor } from "@/components/vendor/vendor-provider";
import type { Booking, WithId } from "@/lib/types";

const OverviewChart = dynamic(() => import("@/components/vendor/overview-chart").then(m => m.OverviewChart), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> });

function toDate(value: Booking["bookingDate"]) {
  return value instanceof Timestamp ? value.toDate() : new Date(value);
}

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: string;
  /** Tailwind classes for the StatCard icon pill. */
  accent: string;
};

/** The "live data" hint every vendor KPI tile carries. */
const LIVE_HINT = (
  <span className="inline-flex items-center gap-1.5 font-semibold">
    <MaterialIcon name="trending_up" className="text-sm" />
    Live data
  </span>
);

function UpcomingBooking({ booking }: { booking: WithId<Booking> }) {
  const date = toDate(booking.bookingDate);

  return (
    <Link
      href="/vendor/dashboard/bookings"
      className="group flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 p-3.5 transition-all duration-300 hover:border-primary/40 hover:bg-background hover:shadow-sm"
    >
      <div className="min-w-0">
        <p className="truncate font-bold text-sm">{booking.serviceName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.customerName || "Customer"}
        </p>
        <p className="kpi-number mt-2 text-xs text-muted-foreground">{format(date, "h:mm a")}</p>
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
      icon: "payments",
      accent: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Completed Jobs",
      value: completedJobs,
      icon: "build_circle",
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Customers",
      value: uniqueCustomers,
      icon: "group",
      accent: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Reviews",
      value: activeBranch?.reviewCount || 0,
      icon: "star",
      accent: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="card-accent-top from-primary via-[var(--qw-gold)] to-transparent opacity-100" />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/6 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Left */}
          <div>
            <Badge
              variant="outline"
              className="mb-4 h-7 gap-2 border-primary/20 bg-gradient-to-r from-primary/10 to-emerald-500/8 px-3"
            >
              <MaterialIcon name="auto_awesome" className="text-sm text-primary animate-glow-breathe" />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">2026 vendor workspace</span>
            </Badge>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-[2.25rem] lg:leading-[1.15]">
              Run your workshop from one{" "}
              <span className="text-gradient-emerald">command center.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Track jobs, revenue, customers, services, inventory, and reviews for{" "}
              <span className="font-semibold text-foreground">{business.displayName || "your garage"}</span>.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild className="justify-start shadow-[0_4px_20px_-4px_rgba(227,30,36,0.35)] hover:shadow-[0_4px_24px_-2px_rgba(227,30,36,0.45)] transition-shadow">
                <Link href="/vendor/dashboard/bookings">
                  <MaterialIcon name="event_note" className="mr-2 text-base" />
                  Manage Bookings
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start hover:border-primary/40 hover:bg-primary/5">
                <Link href="/vendor/dashboard/services">
                  <MaterialIcon name="build" className="mr-2 text-base" />
                  Update Services
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Status pills */}
          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
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
                className="rounded-xl border border-border/60 bg-background/80 p-3.5 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-background hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${pill.dotColor}`} />
                  <p className="section-label">{pill.label}</p>
                </div>
                <p className={`kpi-number mt-2.5 text-xl ${pill.valueColor}`}>{pill.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <StatCardGrid>
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : kpiCards.map(({ label, value, icon, accent }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                icon={<MaterialIcon name={icon} className="text-base" />}
                accent={accent}
                hint={LIVE_HINT}
              />
            ))}
      </StatCardGrid>

      {/* ── Revenue Chart + Sidebar widgets ───────────────────── */}
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Revenue pulse</CardTitle>
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
              <CardTitle className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Next appointments</CardTitle>
              <Button asChild size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                <Link href="/vendor/dashboard/bookings">
                  View all
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </>
              ) : upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <UpcomingBooking key={booking.id} booking={booking} />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
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
