"use client";

import { cn } from "@/shared/cn";

export function RecentValueList({
  values,
  onSelect,
  open,
  className,
}: {
  values: string[];
  onSelect: (value: string) => void;
  open: boolean;
  className?: string;
}) {
  if (!open || values.length === 0) return null;

  return (
    <ul
      className={cn(
        "mt-1.5 overflow-hidden rounded-[10px] border border-border bg-surface shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {values.map((value) => (
        <li key={value}>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(value);
            }}
            className="flex w-full cursor-pointer items-center px-3.5 py-2.5 font-mono text-sm text-foreground transition hover:bg-primary-soft hover:text-primary active:bg-primary/15"
          >
            {value}
          </button>
        </li>
      ))}
    </ul>
  );
}
