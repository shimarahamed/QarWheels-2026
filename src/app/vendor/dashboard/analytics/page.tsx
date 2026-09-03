'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { AreaChart } from "lucide-react";

const chartLoading = () => <Skeleton className="h-[300px] w-full" />;
const OverviewChart = dynamic(() => import("@/components/vendor/overview-chart").then(m => m.OverviewChart), { ssr: false, loading: chartLoading });
const BookingChart = dynamic(() => import("@/components/vendor/booking-chart").then(m => m.BookingChart), { ssr: false, loading: chartLoading });
const RetentionChart = dynamic(() => import("@/components/vendor/retention-chart").then(m => m.RetentionChart), { ssr: false, loading: chartLoading });
const PeakHoursChart = dynamic(() => import("@/components/vendor/peak-hours-chart").then(m => m.PeakHoursChart), { ssr: false, loading: chartLoading });


export default function VendorAnalyticsPage() {
    const [timeRange, setTimeRange] = useState('last_6_months');

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Performance"
        icon={<AreaChart className="h-3.5 w-3.5" />}
        title="Insights into how your garage performs."
        description="Revenue, popular services, customer retention, and the hours your bay is busiest. (Using mock data.)"
        action={
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select a time range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="last_12_months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>A summary of your revenue.</CardDescription>
        </CardHeader>
        <CardContent>
            <OverviewChart timeRange={timeRange} />
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
         <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Popular Services</CardTitle>
                <CardDescription>Breakdown of bookings by service type.</CardDescription>
            </CardHeader>
            <CardContent>
                <BookingChart timeRange={timeRange} />
            </CardContent>
        </Card>
         <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
                <CardDescription>Comparison of new vs. returning customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <RetentionChart timeRange={timeRange} />
            </CardContent>
        </Card>
      </div>

       <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
                <CardDescription>Most popular times for bookings.</CardDescription>
            </CardHeader>
            <CardContent>
                <PeakHoursChart timeRange={timeRange} />
            </CardContent>
        </Card>

    </div>
  );
}

  
