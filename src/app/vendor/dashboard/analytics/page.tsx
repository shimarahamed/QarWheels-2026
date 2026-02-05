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

export default function VendorAnalyticsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your garage's performance.
        </p>
      </header>
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Total revenue generated per month.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Service Type</CardTitle>
            <CardDescription>Most popular services based on booking counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customer Retention</CardTitle>
            <CardDescription>New vs. returning customers over time.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RetentionChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Peak Booking Hours</CardTitle>
            <CardDescription>Busiest hours of the day for bookings.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <PeakHoursChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
