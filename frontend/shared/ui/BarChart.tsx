"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/shared/cn";
import { ChartTooltip } from "@/shared/ui/ChartTooltip";

export type BarChartPoint = {
  label: string;
  value: number;
  color?: string;
};

type BarChartProps = {
  data: BarChartPoint[];
  height?: number;
  className?: string;
  color?: string;
  formatValue?: (value: number) => string;
  layout?: "vertical" | "horizontal";
};

function axisLabel(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export function BarChart({
  data,
  height = 220,
  className,
  color = "var(--primary)",
  formatValue,
  layout = "horizontal",
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-muted",
          className,
        )}
        style={{ height }}
      >
        —
      </div>
    );
  }

  const chartData = data.map((item) => ({
    label: item.label,
    value: item.value,
    fill: item.color ?? color,
  }));

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          layout={layout === "vertical" ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="4 6"
            vertical={layout !== "vertical"}
            horizontal={layout === "vertical" ? false : true}
          />
          {layout === "vertical" ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={axisLabel}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={88}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={axisLabel}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--surface-muted)", opacity: 0.55 }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          <Bar
            dataKey="value"
            radius={layout === "vertical" ? [0, 8, 8, 0] : [8, 8, 4, 4]}
            maxBarSize={42}
          >
            {chartData.map((entry, index) => (
              <Cell key={`${entry.label}-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
