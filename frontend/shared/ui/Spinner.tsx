"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/shared/cn";

export function Spinner({
  className,
  size = "md",
  label,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizeClass =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center gap-2", className)}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClass)} />
      {label ? (
        <span className="text-sm font-medium text-muted">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center py-10">
      <Spinner size="lg" label={label} />
    </div>
  );
}
