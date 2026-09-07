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
    default: "fintech-card",
    glass: "glass-card",
    elevated: "fintech-card bg-surface-elevated",
  };

  return (
    <div
      className={cn(
        "rounded-[14px] transition",
        variants[variant],
        padding && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
