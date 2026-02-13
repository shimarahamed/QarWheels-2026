'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OverviewChart } from "@/components/vendor/overview-chart";
import { BookingChart } from "@/components/vendor/booking-chart";
import { RetentionChart } from "@/components/vendor/retention-chart";
import { PeakHoursChart } from "@/components/vendor/peak-hours-chart";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

export default function VendorAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('last_6_months');

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Analytics</h1>
            <p className="text-muted-foreground">
            Insights into your garage's performance.
            </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[200px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
        </Select>
      </header>
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Total revenue generated per month.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart timeRange={timeRange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Service Type</CardTitle>
            <CardDescription>Most popular services based on booking counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingChart timeRange={timeRange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customer Retention</CardTitle>
            <CardDescription>New vs. returning customers over time.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RetentionChart timeRange={timeRange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Peak Booking Hours</CardTitle>
            <CardDescription>Busiest hours of the day for bookings.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <PeakHoursChart timeRange={timeRange} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
