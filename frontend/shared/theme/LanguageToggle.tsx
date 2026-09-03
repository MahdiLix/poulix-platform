"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/cn";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={
        language === "en" ? "Switch to Persian" : "تغییر زبان به انگلیسی"
      }
      className={cn(
        "flex h-10 items-center justify-center rounded-full bg-surface-muted text-foreground transition hover:bg-border active:scale-95 cursor-pointer max-[460px]:w-10 max-[460px]:px-0 min-[461px]:px-3.5",
        className,
      )}
    >
      <Globe className="h-5 w-5 shrink-0" />
      <span className="hidden min-[461px]:inline text-xs font-bold ms-1.5">
        {language === "en" ? "FA | فارسی" : "EN | English"}
      </span>
    </button>
  );
}
