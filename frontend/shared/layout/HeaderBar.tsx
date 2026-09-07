"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { cn } from "@/shared/cn";
import { AppHeader } from "@/shared/layout/AppHeader";

type HeaderBarProps = {
  title: string;
  backHref?: string;
  trailing?: ReactNode;
  variant?: "plain" | "hero";
  showNotifications?: boolean;
  subtitle?: string;
};

export function HeaderBar({
  title,
  backHref,
  trailing,
  variant = "plain",
  showNotifications = false,
  subtitle,
}: HeaderBarProps) {
  const isHero = variant === "hero";

  return (
    <AppHeader
      variant={isHero ? "hero" : "plain"}
      contentClassName="py-2"
      start={
        backHref ? (
          <Link
            href={backHref}
            className={cn(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] transition active:scale-95",
              isHero
                ? "bg-white/10 text-primary-foreground hover:bg-white/20"
                : "border border-border bg-surface text-foreground hover:border-primary/30",
            )}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        ) : null
      }
      center={
        <div className={cn("min-w-0", backHref ? "text-center" : "text-start")}>
          <h1 className="truncate text-lg font-bold tracking-tight lg:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p
              className={cn(
                "mt-0.5 truncate text-xs font-medium lg:text-sm",
                isHero ? "text-white/70" : "text-muted",
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      }
      end={
        <div className="flex items-center gap-1.5">
          {showNotifications ? <NotificationBell /> : null}
          <div className="hidden items-center gap-1.5 sm:flex lg:hidden">
            <LanguageToggle variant="compact" />
            <ThemeToggle variant="compact" />
          </div>
          {trailing}
        </div>
      }
    />
  );
}
