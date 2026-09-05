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
  Plus,
  Send,
  Shield,
  User,
} from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";
import { cn } from "@/shared/cn";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const groups = [
    {
      label: t.nav.overview,
      items: [
        { href: "/", label: t.nav.home, icon: Home },
        { href: "/statistics", label: t.nav.statistic, icon: BarChart3 },
        { href: "/history", label: t.nav.history, icon: FileText },
      ],
    },
    {
      label: t.nav.moveMoney,
      items: [
        { href: "/send", label: t.home.send, icon: Send },
        { href: "/deposit", label: t.nav.topUp, icon: Plus },
        {
          href: "/transfer",
          label: t.withdrawal.withdrawTitle,
          icon: ArrowUpRight,
        },
      ],
    },
    {
      label: t.nav.plan,
      items: [
        { href: "/scheduled", label: t.scheduled.title, icon: CalendarClock },
        { href: "/goals", label: t.goals.title, icon: PiggyBank },
        { href: "/envelopes", label: t.envelopes.title, icon: Layers },
      ],
    },
    {
      label: t.nav.account,
      items: [
        { href: "/destinations", label: t.destinations.title, icon: Landmark },
        { href: "/notifications", label: t.notifications.title, icon: Bell },
        { href: "/security", label: t.security.title, icon: Shield },
        { href: "/profile", label: t.nav.profile, icon: User },
      ],
    },
  ];

  return (
    <aside className="hidden h-full shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex lg:w-[72px] xl:w-64">
      <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto p-3 xl:p-5">
        <div className="space-y-6">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-3 transition hover:opacity-90 active:scale-[0.98] lg:justify-center xl:justify-start"
          >
            <BrandLogo size={40} priority />
            <div className="hidden min-w-0 xl:block">
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">
                {t.common.appName}
              </h1>
              <p className="text-[10px] font-medium text-sidebar-muted">
                {t.home.financialWallet}
              </p>
            </div>
          </Link>

          <nav className="space-y-4">
            {groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="hidden px-3 text-[10px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase xl:block">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[13px] font-medium transition hover:shadow-sm active:scale-[0.98] lg:justify-center xl:justify-start xl:px-3",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="hidden truncate xl:inline">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
          <ProfileMenu showLabel />
        </div>
      </div>
    </aside>
  );
}
