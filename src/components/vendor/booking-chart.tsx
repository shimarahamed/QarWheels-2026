"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig = {
    count: {
        label: "Bookings",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;


export function BookingChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching and filtering data
        const multiplier = timeRange === 'last_30_days' ? 0.2 : timeRange === 'last_6_months' ? 0.8 : 1;
        const interactiveData = mockAnalyticsData.bookings.map(d => ({
            ...d,
            count: Math.max(1, Math.round(d.count * multiplier * (Math.random() * 0.3 + 0.85)))
        }));
        setData(interactiveData);
        setLoading(false);
    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }


  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer data={data}>
            <XAxis
            dataKey="service"
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
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
