"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Home, User } from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { cn } from "@/shared/cn";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/statistics", label: t.nav.statistic, icon: BarChart3 },
    { href: "/history", label: t.nav.history, icon: FileText },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];

  return (
    <nav className="sticky bottom-0 z-40 mt-auto w-full border-t border-border bg-surface/95 px-2 py-1.5 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex min-w-14 cursor-pointer flex-col items-center justify-center rounded-[10px] px-3 py-1.5 transition hover:bg-surface-muted active:scale-95",
                isActive ? "text-primary" : "text-muted hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-[10px] transition",
                  isActive && "bg-primary-soft",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "mt-0.5 text-[10px] font-medium",
                  isActive && "font-semibold",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
