import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OverviewChart } from "@/components/vendor/overview-chart";
import { BookingChart } from "@/components/vendor/booking-chart";

export default function VendorAnalyticsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your garage's performance.
        </p>
      </header>
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <OverviewChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Service Type</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <BookingChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
