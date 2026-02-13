"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching data based on the time range
        const timer = setTimeout(() => {
            let filteredData = mockAnalyticsData.revenue;
            if (timeRange === 'last_30_days') {
                // For this mock data, "last 30 days" will be the most recent month
                filteredData = mockAnalyticsData.revenue.slice(-1);
            } else if (timeRange === 'last_6_months') {
                filteredData = mockAnalyticsData.revenue.slice(-6);
            }
            setData(filteredData);
            setLoading(false);
        }, 1000); // 1 second delay to simulate network request

        return () => clearTimeout(timer);
    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `QAR ${value / 1000}k`}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
