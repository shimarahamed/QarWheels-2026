"use client"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "../ui/chart";

const chartConfig = {
    new: {
        label: "New Customers",
        color: "hsl(var(--chart-1))",
    },
    returning: {
        label: "Returning Customers",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;


export function RetentionChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching data based on the time range
        let filteredData = mockAnalyticsData.retention;
        if (timeRange === 'last_30_days') {
            filteredData = mockAnalyticsData.retention.slice(-2);
        } else if (timeRange === 'last_6_months') {
            filteredData = mockAnalyticsData.retention.slice(-6);
        }
        setData(filteredData);
        setLoading(false);
    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="month"
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
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="new" type="natural" stroke="var(--color-new)" strokeWidth={2} dot={false} />
                <Line dataKey="returning" type="natural" stroke="var(--color-returning)" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </ChartContainer>
  )
}
