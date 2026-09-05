import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/shared/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border border-primary bg-surface text-primary hover:bg-primary-soft active:bg-primary-soft",
  ghost:
    "bg-transparent text-primary hover:bg-primary-soft active:bg-primary-soft",
  outline:
    "border border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-muted active:bg-surface-muted",
  danger:
    "border border-danger bg-surface text-danger hover:bg-danger-soft active:bg-danger-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[10px] px-3 text-xs",
  md: "h-10 rounded-[10px] px-4 text-sm",
  lg: "h-11 rounded-[10px] px-5 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

function withDefaultWidth(className?: string) {
  if (className && /(^|\s)w-/.test(className)) return className;
  return cn("w-full", className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({
        variant,
        size,
        className: withDefaultWidth(className),
      })}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={buttonClassName({
        variant,
        size,
        className: withDefaultWidth(className),
      })}
    >
      {children}
    </Link>
  );
}
