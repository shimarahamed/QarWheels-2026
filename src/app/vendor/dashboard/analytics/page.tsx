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

const chartLoading = () => <Skeleton className="h-[300px] w-full" />;
const OverviewChart = dynamic(() => import("@/components/vendor/overview-chart").then(m => m.OverviewChart), { ssr: false, loading: chartLoading });
const BookingChart = dynamic(() => import("@/components/vendor/booking-chart").then(m => m.BookingChart), { ssr: false, loading: chartLoading });
const RetentionChart = dynamic(() => import("@/components/vendor/retention-chart").then(m => m.RetentionChart), { ssr: false, loading: chartLoading });
const PeakHoursChart = dynamic(() => import("@/components/vendor/peak-hours-chart").then(m => m.PeakHoursChart), { ssr: false, loading: chartLoading });


export default function VendorAnalyticsPage() {
    const [timeRange, setTimeRange] = useState('last_6_months');

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Analytics</h1>
            <p className="text-muted-foreground">
            Insights into your garage's performance. (Using Mock Data)
            </p>
        </div>
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
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>A summary of your revenue.</CardDescription>
        </CardHeader>
        <CardContent>
            <OverviewChart timeRange={timeRange} />
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Popular Services</CardTitle>
                <CardDescription>Breakdown of bookings by service type.</CardDescription>
            </CardHeader>
            <CardContent>
                <BookingChart timeRange={timeRange} />
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Customer Retention</CardTitle>
                <CardDescription>Comparison of new vs. returning customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <RetentionChart timeRange={timeRange} />
            </CardContent>
        </Card>
      </div>

       <Card>
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

  
