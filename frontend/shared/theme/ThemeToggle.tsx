"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { cn } from "@/shared/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle color theme"
      className={cn(
        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface-muted text-foreground transition hover:bg-border active:scale-95 active:bg-border",
        className,
      )}
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </button>
  );
}
