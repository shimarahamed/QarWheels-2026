"use client"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useState, useEffect } from 'react';
import { mockAnalyticsData } from "@/lib/vendor-data"

export function BookingChart() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        setData(mockAnalyticsData.bookings);
    }, []);

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
