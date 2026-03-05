"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltipContent } from "../ui/chart";

export function PeakHoursChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching and filtering data
        const multiplier = timeRange === 'last_30_days' ? 0.2 : timeRange === 'last_6_months' ? 0.8 : 1;
        const interactiveData = mockAnalyticsData.peakHours.map(d => ({
            ...d,
            bookings: Math.max(1, Math.round(d.bookings * multiplier * (Math.random() * 0.4 + 0.8))),
        }));
        setData(interactiveData);
        setLoading(false);
    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="hour"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
            cursorStyle={{fill: "hsl(var(--accent))", opacity: 0.5}}
            content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
