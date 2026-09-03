"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  FileText,
  Home,
  Landmark,
  Layers,
  PiggyBank,
  Send,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { cn } from "@/shared/cn";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/send", label: t.home.send, icon: Send },
    {
      href: "/transfer",
      label: t.withdrawal.withdrawTitle,
      icon: ArrowUpRight,
    },
    { href: "/scheduled", label: t.scheduled.title, icon: CalendarClock },
    { href: "/goals", label: t.goals.title, icon: PiggyBank },
    { href: "/envelopes", label: t.envelopes.title, icon: Layers },
    { href: "/notifications", label: t.notifications.title, icon: Bell },
    { href: "/statistics", label: t.nav.statistic, icon: BarChart3 },
    { href: "/history", label: t.nav.history, icon: FileText },
    { href: "/destinations", label: t.destinations.title, icon: Landmark },
    { href: "/security", label: t.security.title, icon: Shield },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];

  return (
    <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:justify-between lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6 lg:shadow-md">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-3.5 transition hover:opacity-90 active:scale-95"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hero-gradient text-primary-foreground shadow-md shadow-primary/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground">
              {t.common.appName}
            </h1>
            <p className="text-[11px] font-medium text-muted">
              Financial Wallet
            </p>
          </div>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition active:scale-95",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">Preferences</span>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
