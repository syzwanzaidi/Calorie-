"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import type { WeightPoint } from "@/lib/data/trends";

export function WeightTrendChart({ data }: { data: WeightPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="border border-hairline rounded-md p-4">
        <h3 className="text-sm text-text-muted mb-2">Weight</h3>
        <p className="text-sm text-text-muted">
          No weight logged yet. Add one from Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-hairline rounded-md p-4">
      <h3 className="text-sm text-text-muted mb-4">Weight (kg)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
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
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--hairline)" }} />
          <Line
            type="monotone"
            dataKey="weightKg"
            name="Weight"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
