"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "../ui/chart";

const chartConfig = {
    bookings: {
        label: "Bookings",
        color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;


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
     <ChartContainer config={chartConfig} className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={data}>
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
                    cursor={false}
                    content={<ChartTooltipContent />}
                />
                <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
