"use client";

type TooltipItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
};

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[10px] border border-border bg-surface px-3 py-2 shadow-[var(--shadow-card)]">
      {label ? (
        <p className="mb-1.5 text-[11px] font-semibold text-muted">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const numeric =
            typeof item.value === "number" ? item.value : Number(item.value);
          const display = formatValue
            ? formatValue(Number.isFinite(numeric) ? numeric : 0)
            : String(item.value ?? "");
          return (
            <div
              key={`${item.name ?? "item"}-${index}`}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.color || item.payload?.fill || "var(--primary)",
                }}
              />
              {item.name ? (
                <span className="font-medium text-muted">{item.name}</span>
              ) : null}
              <span className="ms-auto font-bold tabular-nums text-foreground">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
