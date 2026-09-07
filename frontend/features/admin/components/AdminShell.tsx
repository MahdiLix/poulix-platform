"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Landmark,
  LayoutDashboard,
  ScrollText,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";
import { AppHeader } from "@/shared/layout/AppHeader";
import { GlobalSearch } from "@/shared/search/GlobalSearch";
import { cn } from "@/shared/cn";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

export function AdminShell({
  title,
  subtitle,
  children,
  showHeading = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showHeading?: boolean;
  user?: { email?: string; username?: string } | null;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/admin", label: t.admin.nav.dashboard, icon: LayoutDashboard },
    { href: "/admin/users", label: t.admin.nav.users, icon: Users },
    {
      href: "/admin/transactions",
      label: t.admin.nav.transactions,
      icon: FileText,
    },
    { href: "/admin/payments", label: t.admin.nav.payments, icon: Landmark },
    {
      href: "/admin/withdrawals",
      label: t.admin.nav.withdrawals,
      icon: Wallet,
    },
    { href: "/admin/security", label: t.admin.nav.security, icon: Shield },
    { href: "/admin/audit", label: t.admin.nav.audit, icon: ScrollText },
  ];

  return (
    <div className="h-dvh overflow-hidden bg-canvas text-foreground">
      <div className="flex h-full">
        <aside className="fintech-sidebar hidden h-full shrink-0 flex-col overflow-y-auto border-e border-white/5 text-sidebar-foreground lg:flex lg:w-[72px] xl:w-60">
          <div className="flex min-h-0 flex-1 flex-col justify-between p-3 xl:p-5">
            <div className="space-y-6">
              <div className="flex items-center gap-3 lg:justify-center xl:justify-start">
                <BrandLogo size={40} priority />
                <div className="hidden min-w-0 xl:block">
                  <p className="text-base font-bold tracking-tight text-sidebar-foreground">
                    {t.common.appName}
                  </p>
                  <p className="text-[10px] font-medium text-sidebar-muted">
                    {t.admin.title}
                  </p>
                </div>
              </div>

              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] font-medium transition active:scale-[0.98] lg:justify-center xl:justify-start xl:px-3",
                        isActive
                          ? "bg-gradient-to-r from-primary to-[#4d8cff] text-primary-foreground shadow-[0_8px_24px_rgba(43,107,235,0.32)]"
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
              </nav>
            </div>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
              <Link
                href="/"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-primary transition hover:bg-white/10 active:scale-[0.98] xl:justify-start"
              >
                ← <span className="hidden xl:inline">{t.admin.backToApp}</span>
              </Link>
              <ProfileMenu showLabel />
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppHeader
            start={
              <Link href="/admin" className="lg:hidden">
                <BrandLogo size={32} />
              </Link>
            }
            center={
              <div className="mx-auto hidden max-w-xl lg:block">
                <GlobalSearch scope="admin" placeholder={t.admin.search} />
              </div>
            }
            end={
              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="hidden items-center gap-1 lg:flex">
                  <ThemeToggle variant="compact" />
                  <LanguageToggle variant="compact" />
                </div>
                <ProfileMenu />
              </div>
            }
          />

          <main className="dashboard-canvas min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
            {showHeading ? (
              <div className="mb-6 text-center lg:text-start">
                <h1 className="text-lg font-semibold tracking-tight text-foreground lg:text-xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-muted">{subtitle}</p>
                ) : null}
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
