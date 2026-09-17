"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { cn } from "@/shared/cn";

export function ThemeToggle({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar" | "compact";
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isSidebar = variant === "sidebar";
  const isCompact = variant === "compact" || isSidebar;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 transition active:scale-95",
        isSidebar
          ? "text-sidebar-muted hover:text-sidebar-foreground"
          : "rounded-full border border-border bg-surface px-1.5 py-1 text-muted hover:text-foreground",
        className,
      )}
    >
      <Sun
        className={cn(
          isCompact ? "h-3 w-3" : "h-3.5 w-3.5",
          !isDark && "text-accent-amber",
        )}
      />
      <span
        className={cn(
          "relative rounded-full shadow-inner transition",
          isCompact ? "h-4 w-7" : "h-5 w-9",
          isDark
            ? "bg-primary ring-1 ring-inset ring-white/25"
            : isSidebar
              ? "bg-white/45 ring-1 ring-inset ring-white/50"
              : "bg-primary/45 ring-1 ring-inset ring-primary/30",
        )}
      >
        <span
          className={cn(
            "absolute rounded-full bg-white shadow-md shadow-black/20 transition-all",
            isCompact ? "top-0.5 h-3 w-3" : "top-0.5 h-4 w-4",
            isDark ? "end-0.5" : "start-0.5",
          )}
        />
      </span>
      <Moon
        className={cn(
          isCompact ? "h-3 w-3" : "h-3.5 w-3.5",
          isDark && "text-accent-teal",
        )}
      />
    </button>
  );
}
