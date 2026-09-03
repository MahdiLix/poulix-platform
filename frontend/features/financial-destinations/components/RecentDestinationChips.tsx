"use client";

import type { FinancialDestination } from "../lib/destinations";

export function RecentDestinationChips({
  destinations,
  onSelect,
  emptyLabel,
}: {
  destinations: FinancialDestination[];
  onSelect: (destination: FinancialDestination) => void;
  emptyLabel?: string;
}) {
  if (destinations.length === 0) {
    return emptyLabel ? (
      <p className="text-[11px] font-medium text-muted">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {destinations.map((destination) => (
        <button
          key={destination.id}
          type="button"
          onClick={() => onSelect(destination)}
          className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary-soft/40 active:scale-95"
        >
          {destination.label}
        </button>
      ))}
    </div>
  );
}
