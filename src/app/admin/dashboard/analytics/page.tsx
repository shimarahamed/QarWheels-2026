'use client';

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, query, Timestamp } from "firebase/firestore";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart3, Building2, CalendarCheck, CircleDollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import type { Booking, UserProfile, Branch, WithId } from "@/lib/types";

const MonthlyBarChart = dynamic(
  () => import("@/components/admin/monthly-bar-chart").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: () => <Skeleton className="h-52 rounded-2xl" /> }
);

function toDate(v: Booking["bookingDate"]) {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

export default function AdminAnalyticsPage() {
  const { firestore } = useFirebase();

  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, "bookings")), [firestore]);
  const usersQuery = useMemoFirebase(() => query(collection(firestore, "users")), [firestore]);
  const vendorsQuery = useMemoFirebase(() => query(collection(firestore, "branches")), [firestore]);

  const { data: bookings, isLoading: lb } = useCollection<WithId<Booking>>(bookingsQuery);
  const { data: users, isLoading: lu } = useCollection<WithId<UserProfile>>(usersQuery);
  const { data: vendors, isLoading: lv } = useCollection<WithId<Branch>>(vendorsQuery);

  const isLoading = lb || lu || lv;

  // Monthly revenue & booking counts for last 6 months
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        month: format(d, "MMM"),
        start: startOfMonth(d).getTime(),
        end: endOfMonth(d).getTime(),
        revenue: 0,
        bookings: 0,
      };
    });

    for (const b of bookings || []) {
      const t = toDate(b.bookingDate).getTime();
      for (const m of months) {
        if (t >= m.start && t <= m.end) {
          m.bookings += 1;
          if (b.status === "Completed") m.revenue += b.cost || 0;
        }
      }
    }

    return months;
  }, [bookings]);

  // Top garages by completed revenue — keyed per branch, which is the unit a
  // booking is actually fulfilled by and the name the booking carries.
  const topVendors = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; bookings: number }> = {};
    for (const b of bookings || []) {
      if (!map[b.branchId]) map[b.branchId] = { name: b.branchName, revenue: 0, bookings: 0 };
      map[b.branchId].bookings += 1;
      if (b.status === "Completed") map[b.branchId].revenue += b.cost || 0;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [bookings]);

  // Top services
  const topServices = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const b of bookings || []) {
      if (!map[b.serviceName]) map[b.serviceName] = { count: 0, revenue: 0 };
      map[b.serviceName].count += 1;
      if (b.status === "Completed") map[b.serviceName].revenue += b.cost || 0;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bookings]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">

      <PageHeader
        eyebrow="Insights"
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        title="Analytics"
        description="Platform-wide performance metrics across users, vendors, bookings and revenue."
      />

      {/* KPI row */}
      <StatCardGrid>
        {[
          { label: "Total Users", value: users?.length ?? 0, icon: Users, accent: "bg-violet-500/10 text-violet-600" },
          { label: "Total Vendors", value: vendors?.length ?? 0, icon: Building2, accent: "bg-emerald-500/10 text-emerald-600" },
          { label: "Total Bookings", value: bookings?.length ?? 0, icon: CalendarCheck, accent: "bg-amber-500/10 text-amber-600" },
          {
            label: "Total Revenue",
            value: `QAR ${((bookings || []).filter((b) => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0)).toLocaleString()}`,
            icon: CircleDollarSign,
            accent: "bg-primary/10 text-primary",
          },
        ].map(({ label, value, icon: Icon, accent }) => (
          <StatCard
            key={label}
            label={label}
            value={isLoading ? "—" : value}
            icon={<Icon className="h-4 w-4" />}
            accent={accent}
          />
        ))}
      </StatCardGrid>

      {/* Charts row */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Revenue chart */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Monthly Revenue</CardTitle>
              <Badge variant="outline" className="bg-primary/8 text-primary border-primary/20 text-[11px]">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 rounded-2xl" />
            ) : (
              <MonthlyBarChart data={monthlyData} dataKey="revenue" fill="hsl(var(--primary))" />
            )}
          </CardContent>
        </Card>

        {/* Bookings chart */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Monthly Bookings</CardTitle>
              <Badge variant="outline" className="bg-amber-500/8 text-amber-600 border-amber-500/20 text-[11px]">Last 6 months</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 rounded-2xl" />
            ) : (
              <MonthlyBarChart data={monthlyData} dataKey="bookings" fill="hsl(38 92% 50%)" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top vendors + Top services */}
      <div className="grid gap-5 xl:grid-cols-2">

        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Top Vendors by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : topVendors.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No vendor revenue yet"
                description="Once bookings are completed, the top-earning branches will be ranked here."
              />
            ) : (
              <div className="space-y-3">
                {topVendors.map((v, i) => {
                  const max = topVendors[0]?.revenue || 1;
                  const pct = Math.round((v.revenue / max) * 100);
                  return (
                    <div key={v.id} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                          <span className="text-muted-foreground">#{i + 1}</span>
                          <span className="truncate">{v.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">QAR {v.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/50 transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Most Booked Services</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            ) : topServices.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="h-8 w-8" />}
                title="No services booked yet"
                description="The most frequently booked services will be ranked here."
              />
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => {
                  const max = topServices[0]?.count || 1;
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                          <span className="text-muted-foreground">#{i + 1}</span>
                          <span className="truncate">{s.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{s.count} bookings</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
