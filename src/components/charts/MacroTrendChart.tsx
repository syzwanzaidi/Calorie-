"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import type { DailyTotal } from "@/lib/data/trends";

export function MacroTrendChart({ data }: { data: DailyTotal[] }) {
  return (
    <div className="border border-hairline rounded-md p-4">
      <h3 className="text-sm text-text-muted mb-4">Macros (g)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap={4} barGap={2}>
          <CartesianGrid
            vertical={false}
            stroke="var(--hairline)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--hairline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--hairline)", opacity: 0.4 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
          />
          <Bar
            dataKey="proteinG"
            name="Protein"
            fill="var(--protein)"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="carbsG"
            name="Carbs"
            fill="var(--carbs)"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="fatG"
            name="Fat"
            fill="var(--fat)"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
