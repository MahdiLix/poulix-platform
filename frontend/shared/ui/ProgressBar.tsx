import { cn } from "@/shared/cn";

type ProgressBarProps = {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
};

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-500",
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <p className="text-right text-[11px] font-semibold text-muted">
          {pct}%
        </p>
      ) : null}
    </div>
  );
}
