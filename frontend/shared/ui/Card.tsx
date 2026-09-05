import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type CardProps = {
  className?: string;
  children: ReactNode;
  variant?: "default" | "glass" | "elevated";
  padding?: boolean;
};

export function Card({
  className,
  children,
  variant = "default",
  padding = false,
}: CardProps) {
  const variants = {
    default: "border border-border bg-surface shadow-[var(--shadow-card)]",
    glass: "glass-card",
    elevated:
      "border border-border bg-surface-elevated shadow-[var(--shadow-card)]",
  };

  return (
    <div
      className={cn(
        "rounded-[14px] transition hover:border-primary/25",
        variants[variant],
        padding && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
