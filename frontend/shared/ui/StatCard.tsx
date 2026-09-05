import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/cn";

type StatCardProps = {
  label: string;
  value: string;
  trend?: number;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  iconClassName,
  className,
}: StatCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn(
        "rounded-[14px] border border-border bg-surface p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold text-muted">{label}</p>
          <p className="amount truncate text-lg font-bold tracking-tight text-foreground">
            {value}
          </p>
          {trend !== undefined ? (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold",
                trendPositive ? "text-success" : "text-danger",
              )}
            >
              {trendPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {trendPositive ? "+" : ""}
                {trend}%
              </span>
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconClassName ?? "bg-primary-soft text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
