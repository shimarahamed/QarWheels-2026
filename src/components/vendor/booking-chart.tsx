"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"
import { Skeleton } from "@/components/ui/skeleton";

export function BookingChart({ timeRange }: { timeRange: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate fetching and filtering data
        const timer = setTimeout(() => {
            // Adjust counts to make the chart feel interactive
            const multiplier = timeRange === 'last_30_days' ? 0.2 : timeRange === 'last_6_months' ? 0.8 : 1;
            const interactiveData = mockAnalyticsData.bookings.map(d => ({
                ...d,
                count: Math.max(1, Math.round(d.count * multiplier * (Math.random() * 0.3 + 0.85)))
            }));
            setData(interactiveData);
            setLoading(false);
        }, 1200);

        return () => clearTimeout(timer);
    }, [timeRange]);

    if (loading) {
        return <Skeleton className="h-[350px] w-full" />;
    }


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="service"
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
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
            contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
            }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} >
            {data.map((entry, index) => (
                <div key={`cell-${index}`} color={entry.fill} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
