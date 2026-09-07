"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import type { DailyTotal } from "@/lib/data/trends";

export function CaloriesTrendChart({
  data,
  target,
}: {
  data: DailyTotal[];
  target: number | null;
}) {
  return (
    <div className="border border-hairline rounded-md p-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm text-text-muted">Calories</h3>
        {target !== null && (
          <p className="text-xs text-text-muted">
            Target <span className="font-numeric">{target}</span> kcal
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap={4}>
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
          {target !== null && (
            <ReferenceLine
              y={target}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={{
                value: "Target",
                position: "insideTopRight",
                fill: "var(--text-muted)",
                fontSize: 11,
              }}
            />
          )}
          <Bar
            dataKey="calories"
            name="Calories"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
