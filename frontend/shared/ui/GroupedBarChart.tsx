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
import { ChartTooltip } from "@/shared/ui/ChartTooltip";

export type GroupedBarSeries = {
  key: string;
  label: string;
  color: string;
};

export type GroupedBarRow = {
  label: string;
  [key: string]: string | number;
};

export function GroupedBarChart({
  data,
  series,
  height = 250,
  formatValue,
}: {
  data: GroupedBarRow[];
  series: GroupedBarSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          barCategoryGap="32%"
          barGap={3}
        >
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span className="text-[10px] font-semibold text-muted">
                {value}
              </span>
            )}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              radius={[5, 5, 1, 1]}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
