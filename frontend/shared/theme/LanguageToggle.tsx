"use client";

import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/cn";

export function LanguageToggle({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "sidebar" | "compact";
}) {
  const { language, setLanguage } = useLanguage();
  const isSidebar = variant === "sidebar";
  const isCompact = variant === "compact" || isSidebar;

  const buttons = [
    { id: "en" as const, label: "EN" },
    { id: "fa" as const, label: "FA" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        isSidebar ? "bg-white/10" : "border border-border bg-surface-muted/80",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {buttons.map((item) => {
        const active = language === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setLanguage(item.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-full font-semibold tracking-wide transition active:scale-95",
              isCompact
                ? "h-6 min-w-7 px-1.5 text-[10px]"
                : "h-7 min-w-8 px-2 text-[11px]",
              active
                ? isSidebar
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : isSidebar
                  ? "text-sidebar-muted hover:text-sidebar-foreground"
                  : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
