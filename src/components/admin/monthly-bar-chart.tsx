'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const chartConfig = {
  revenue: { label: "Revenue (QAR)", color: "hsl(var(--chart-1))" },
  bookings: { label: "Bookings", color: "hsl(var(--chart-2))" },
};

export function MonthlyBarChart({
  data,
  dataKey,
  fill,
}: {
  data: Array<{ month: string; revenue: number; bookings: number }>;
  dataKey: "revenue" | "bookings";
  fill: string;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-52 w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
