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
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { cn } from "@/shared/cn";

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
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
    <div className="min-h-screen bg-canvas text-foreground lg:p-8">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col md:max-w-3xl lg:min-h-[calc(100vh-4rem)] lg:max-w-7xl lg:flex-row lg:gap-8">
        <aside className="border-b border-border bg-surface p-4 lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between lg:rounded-3xl lg:border lg:p-6 lg:shadow-md">
          <div className="space-y-6">
            <div>
              <p className="text-lg font-extrabold">{t.admin.title}</p>
              <p className="text-[11px] text-muted">{t.admin.subtitle}</p>
            </div>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
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
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold lg:text-sm",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Link href="/" className="text-xs font-semibold text-primary">
              {t.admin.backToApp}
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-background p-6 lg:rounded-3xl lg:border lg:border-border lg:shadow-sm">
          <h1 className="mb-6 text-xl font-bold">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
