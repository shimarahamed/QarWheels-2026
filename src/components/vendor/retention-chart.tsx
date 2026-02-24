"use client"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";

export function RetentionChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching data based on the time range
        let filteredData = mockAnalyticsData.retention;
        if (timeRange === 'last_30_days') {
            filteredData = mockAnalyticsData.retention.slice(-1);
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
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
            contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
            }}
        />
        <Legend wrapperStyle={{fontSize: "0.8rem"}} />
        <Line type="monotone" dataKey="new" name="New Customers" stroke="hsl(var(--chart-1))" strokeWidth={2} />
        <Line type="monotone" dataKey="returning" name="Returning Customers" stroke="hsl(var(--chart-2))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
