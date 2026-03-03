"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

// MOCK DATA is now local to this component until live data is piped in.
const mockRevenue = [
    { month: "Jan", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Feb", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Mar", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Apr", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "May", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Jun", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Jul", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Aug", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Sep", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Oct", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Nov", total: Math.floor(Math.random() * 5000) + 1000 },
    { month: "Dec", total: Math.floor(Math.random() * 5000) + 1000 },
]

export function OverviewChart({ timeRange }: { timeRange?: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching data based on the time range
        let filteredData = mockRevenue;
        if (timeRange === 'last_30_days') {
            // For this mock data, "last 30 days" will be the most recent month
            filteredData = mockRevenue.slice(-1);
        } else if (timeRange === 'last_6_months') {
            filteredData = mockRevenue.slice(-6);
        }
        setData(filteredData);
        setLoading(false);

    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
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
          tickFormatter={(value) => `QAR ${value / 1000}k`}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
