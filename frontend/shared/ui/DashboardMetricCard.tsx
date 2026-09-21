import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/cn";
import { Sparkline } from "@/shared/ui/Sparkline";

type MetricTone = "blue" | "emerald" | "violet" | "amber" | "rose";

const toneStyles: Record<
  MetricTone,
  { icon: string; value: string; spark: string; glow: string }
> = {
  blue: {
    icon: "bg-primary-soft text-primary",
    value: "text-primary",
    spark: "var(--primary)",
    glow: "from-primary/12",
  },
  emerald: {
    icon: "bg-secondary-soft text-secondary",
    value: "text-secondary",
    spark: "var(--secondary)",
    glow: "from-secondary/12",
  },
  violet: {
    icon: "bg-accent-purple-soft text-accent-purple",
    value: "text-accent-purple",
    spark: "var(--accent-purple)",
    glow: "from-accent-purple/12",
  },
  amber: {
    icon: "bg-accent-amber-soft text-accent-amber",
    value: "text-accent-amber",
    spark: "var(--accent-amber)",
    glow: "from-accent-amber/12",
  },
  rose: {
    icon: "bg-danger-soft text-danger",
    value: "text-danger",
    spark: "var(--danger)",
    glow: "from-danger/12",
  },
};

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  trend,
  caption,
  spark,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: MetricTone;
  trend?: number;
  caption?: string;
  spark?: number[];
  className?: string;
}) {
  const styles = toneStyles[tone];
  const positive = trend !== undefined && trend >= 0;

  return (
    <article
      className={cn(
        "fintech-card group relative isolate min-h-28 overflow-hidden p-4 lg:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br to-transparent opacity-80",
          styles.glow,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
          {label}
        </p>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/10 shadow-[0_0_22px_currentColor]",
            styles.icon,
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p
        className={cn(
          "amount mt-2 break-words text-[13px] font-extrabold tracking-tight sm:text-sm 2xl:text-base",
          styles.value,
        )}
      >
        {value}
      </p>

      <div className="mt-2 flex min-h-7 items-end justify-between gap-3">
        <div className="min-w-0">
          {trend !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold",
                positive ? "text-secondary" : "text-danger",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {positive ? "+" : ""}
              {trend}%
            </span>
          ) : null}
          {caption ? (
            <p className="mt-0.5 truncate text-[10px] text-muted">{caption}</p>
          ) : null}
        </div>
        {spark && spark.length > 1 ? (
          <Sparkline
            data={spark}
            color={styles.spark}
            className="opacity-90 transition group-hover:opacity-100"
            height={30}
          />
        ) : null}
      </div>
    </article>
  );
}
