import { cn } from "@/shared/cn";

type SparklineProps = {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
};

export function Sparkline({
  data,
  color = "var(--primary)",
  className,
  height = 28,
}: SparklineProps) {
  const values = data.length > 1 ? data : [0, ...(data.length ? data : [1])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 72;
  const h = height;
  const pad = 2;

  const points = values
    .map((value, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (value - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("w-16 shrink-0", className)}
      style={{ height }}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
