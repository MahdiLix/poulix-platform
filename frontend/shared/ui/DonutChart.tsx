"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/shared/cn";
import { ChartTooltip } from "@/shared/ui/ChartTooltip";

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
  formatValue?: (value: number) => string;
};

export function DonutChart({
  segments,
  size = 160,
  centerLabel,
  centerValue,
  className,
  formatValue,
}: DonutChartProps) {
  const data = segments
    .map((segment) => ({
      name: segment.label,
      value: Math.max(0, segment.value),
      fill: segment.color,
    }))
    .filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData =
    total > 0
      ? data
      : [{ name: "Empty", value: 1, fill: "var(--surface-muted)" }];

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={chartData.length > 1 && total > 0 ? 3 : 0}
            stroke="var(--surface)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((item, index) => (
              <Cell key={`${item.name}-${index}`} fill={item.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {centerValue ? (
            <p className="text-lg font-bold leading-tight text-foreground">{centerValue}</p>
          ) : null}
          {centerLabel ? (
            <p className="mt-0.5 text-[11px] font-medium text-muted">{centerLabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
