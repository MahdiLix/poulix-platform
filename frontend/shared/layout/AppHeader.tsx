import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type AppHeaderProps = {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "surface" | "plain" | "hero";
};

/**
 * Shared header composition. Each shell owns its sidebar and supplies only the
 * start, center, and end content that belongs inside the header.
 */
export function AppHeader({
  start,
  center,
  end,
  className,
  contentClassName,
  variant = "surface",
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-40 shrink-0",
        variant === "surface" &&
          "border-b border-border-subtle bg-background/80 backdrop-blur-xl",
        variant === "plain" && "bg-background text-foreground",
        variant === "hero" && "text-primary-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-14 w-full items-center gap-3 px-4 lg:px-5",
          contentClassName,
        )}
      >
        {start ? <div className="shrink-0">{start}</div> : null}
        <div className="min-w-0 flex-1">{center}</div>
        {end ? <div className="shrink-0">{end}</div> : null}
      </div>
    </header>
  );
}
