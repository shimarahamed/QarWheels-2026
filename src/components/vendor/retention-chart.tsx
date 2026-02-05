"use client"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"

export function RetentionChart() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        setData(mockAnalyticsData.retention);
    }, []);

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
