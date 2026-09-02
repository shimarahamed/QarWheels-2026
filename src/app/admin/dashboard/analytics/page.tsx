'use client';

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, query, Timestamp } from "firebase/firestore";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart3, Building2, CalendarCheck, CircleDollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import type { Booking, UserProfile, Vendor, WithId } from "@/lib/types";

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
  const vendorsQuery = useMemoFirebase(() => query(collection(firestore, "vendors")), [firestore]);

  const { data: bookings, isLoading: lb } = useCollection<WithId<Booking>>(bookingsQuery);
  const { data: users, isLoading: lu } = useCollection<WithId<UserProfile>>(usersQuery);
  const { data: vendors, isLoading: lv } = useCollection<WithId<Vendor>>(vendorsQuery);

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

  // Top vendors by completed revenue
  const topVendors = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; bookings: number }> = {};
    for (const b of bookings || []) {
      if (!map[b.vendorId]) map[b.vendorId] = { name: b.vendorName, revenue: 0, bookings: 0 };
      map[b.vendorId].bookings += 1;
      if (b.status === "Completed") map[b.vendorId].revenue += b.cost || 0;
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

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide performance metrics</p>
      </header>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Users", value: users?.length ?? 0, icon: Users, iconBg: "bg-violet-500/10", iconColor: "text-violet-600", accent: "from-violet-500 via-indigo-400 to-transparent" },
          { label: "Total Vendors", value: vendors?.length ?? 0, icon: Building2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", accent: "from-emerald-500 via-teal-400 to-transparent" },
          { label: "Total Bookings", value: bookings?.length ?? 0, icon: CalendarCheck, iconBg: "bg-amber-500/10", iconColor: "text-amber-600", accent: "from-amber-500 via-orange-400 to-transparent" },
          {
            label: "Total Revenue",
            value: `QAR ${((bookings || []).filter((b) => b.status === "Completed").reduce((s, b) => s + (b.cost || 0), 0)).toLocaleString()}`,
            icon: CircleDollarSign,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
            accent: "from-primary via-sky-400 to-transparent",
          },
        ].map((k) => (
          <div key={k.label} className="bento-card p-5">
            <div className={`card-accent-top bg-gradient-to-r ${k.accent}`} />
            <div className="flex items-start justify-between gap-3">
              <p className="section-label">{k.label}</p>
              <div className={`icon-pill h-9 w-9 ${k.iconBg}`}>
                <k.icon className={`h-4 w-4 ${k.iconColor}`} />
              </div>
            </div>
            <p className="metric-number mt-3">{isLoading ? "—" : k.value}</p>
          </div>
        ))}
      </div>

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
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topVendors.map((v, i) => {
                  const max = topVendors[0]?.revenue || 1;
                  const pct = Math.round((v.revenue / max) * 100);
                  return (
                    <div key={v.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="text-muted-foreground">#{i + 1}</span> {v.name}
                        </span>
                        <span className="text-muted-foreground">QAR {v.revenue.toLocaleString()}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill bg-gradient-to-r from-primary to-sky-400" style={{ width: `${pct}%` }} />
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
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => {
                  const max = topServices[0]?.count || 1;
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="text-muted-foreground">#{i + 1}</span> {s.name}
                        </span>
                        <span className="text-muted-foreground">{s.count} bookings</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${pct}%` }} />
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
