"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { cn } from "@/shared/cn";

type HeaderBarProps = {
  title: string;
  backHref?: string;
  trailing?: ReactNode;
  variant?: "plain" | "hero";
  showNotifications?: boolean;
};

export function HeaderBar({
  title,
  backHref,
  trailing,
  variant = "plain",
  showNotifications = true,
}: HeaderBarProps) {
  const isHero = variant === "hero";

  return (
    <header
      className={cn(
        "flex items-center justify-between px-6 pt-6 pb-4",
        isHero ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className={cn(
            "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition active:scale-95",
            isHero
              ? "bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30"
              : "bg-surface-muted text-foreground hover:bg-border active:bg-border",
          )}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
      ) : (
        <div className="h-10 w-10" />
      )}

      <h1 className="text-base font-bold">{title}</h1>

      <div className="flex items-center gap-2">
        {showNotifications ? (
          <NotificationBell
            className={
              isHero
                ? "bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30"
                : undefined
            }
          />
        ) : null}
        <LanguageToggle
          className={
            isHero
              ? "bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30"
              : undefined
          }
        />
        <ThemeToggle
          className={
            isHero
              ? "bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30"
              : undefined
          }
        />
        {trailing}
      </div>
    </header>
  );
}
