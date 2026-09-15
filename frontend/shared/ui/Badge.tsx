import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type BadgeVariant =
  "default" | "success" | "warning" | "danger" | "info" | "muted";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-secondary-soft text-secondary",
  muted: "bg-surface-muted text-muted",
};

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
