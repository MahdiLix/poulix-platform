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
  const { language, toggleLanguage } = useLanguage();
  const isSidebar = variant === "sidebar";
  const isCompact = variant === "compact" || isSidebar;
  const nextLanguage = language === "fa" ? "en" : "fa";
  const nextLabel = nextLanguage.toUpperCase();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={
        nextLanguage === "en" ? "Switch to English" : "Switch to Persian"
      }
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full font-semibold tracking-wide transition active:scale-95",
        isCompact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]",
        isSidebar
          ? "border border-white/15 bg-white/10 text-sidebar-foreground hover:bg-white/20"
          : "border border-border bg-surface text-foreground hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      {nextLabel}
    </button>
  );
}
