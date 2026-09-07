"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/cn";

export function getPaginationItems(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((item) => item > 0 && item <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  sorted.forEach((item, index) => {
    if (index > 0 && item - sorted[index - 1]! > 1) result.push("ellipsis");
    result.push(item);
  });
  return result;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  previousLabel = "Previous",
  nextLabel = "Next",
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const current = Math.min(totalPages, Math.max(1, page));

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        aria-label={previousLabel}
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </button>
      {getPaginationItems(current, totalPages).map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-9 w-7 items-center justify-center text-sm text-muted"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === current ? "page" : undefined}
            aria-label={`Page ${item}`}
            onClick={() => onPageChange(item)}
            className={cn(
              "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition",
              item === current
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-surface text-foreground hover:border-primary/30 hover:text-primary",
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label={nextLabel}
        disabled={current === totalPages}
        onClick={() => onPageChange(current + 1)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </nav>
  );
}
