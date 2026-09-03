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
    <nav className="sticky bottom-0 z-40 mt-auto w-full border-t border-border bg-surface px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.28)] lg:hidden">
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
                "flex min-w-14 cursor-pointer flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-colors hover:bg-surface-muted active:scale-95",
                isActive
                  ? "font-bold text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
