"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/shared/cn";
import { ChartTooltip } from "@/shared/ui/ChartTooltip";

export type AreaChartPoint = {
  label: string;
  value: number;
};

export type AreaChartSeries = {
  label: string;
  color: string;
  data: AreaChartPoint[];
  dashed?: boolean;
};

type AreaChartProps = {
  data?: AreaChartPoint[];
  series?: AreaChartSeries[];
  height?: number;
  className?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
};

function axisLabel(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

export function AreaChart({
  data,
  series,
  height = 200,
  className,
  color = "var(--primary)",
  showGrid = true,
  showLegend = false,
  formatValue,
}: AreaChartProps) {
  const reactId = useId().replace(/:/g, "");
  const normalizedSeries: AreaChartSeries[] = useMemo(() => {
    if (series && series.length > 0) return series;
    return [{ label: "", color, data: data ?? [] }];
  }, [series, color, data]);

  const chartData = useMemo(() => {
    const labels =
      normalizedSeries.find((item) => item.data.length > 0)?.data.map((d) => d.label) ??
      [];
    return labels.map((label, index) => {
      const row: Record<string, string | number> = { label };
      normalizedSeries.forEach((item, seriesIndex) => {
        row[`s${seriesIndex}`] = item.data[index]?.value ?? 0;
      });
      return row;
    });
  }, [normalizedSeries]);

  if (chartData.length === 0) {
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

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            {normalizedSeries.map((item, index) => (
              <linearGradient
                key={`${reactId}-${index}`}
                id={`${reactId}-fill-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {showGrid ? (
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="4 6"
              vertical={false}
            />
          ) : null}
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={axisLabel}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          {showLegend && normalizedSeries.some((item) => item.label) ? (
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-semibold text-muted">{value}</span>
              )}
            />
          ) : null}
          {normalizedSeries.map((item, index) => (
            <Area
              key={`${item.label}-${index}`}
              type="monotone"
              dataKey={`s${index}`}
              name={item.label || undefined}
              stroke={item.color}
              fill={`url(#${reactId}-fill-${index})`}
              strokeWidth={2.25}
              strokeDasharray={item.dashed ? "5 5" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
