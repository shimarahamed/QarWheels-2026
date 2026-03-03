'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart } from "lucide-react";


export default function VendorAnalyticsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Analytics</h1>
        <p className="text-muted-foreground">
        Insights into your garage's performance.
        </p>
      </header>
      <Card className="flex items-center justify-center min-h-[400px]">
        <CardContent className="text-center text-muted-foreground p-8">
            <AreaChart className="h-16 w-16 mx-auto mb-4 text-primary/30" />
            <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
            <p>Our advanced analytics dashboard is currently under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}

  