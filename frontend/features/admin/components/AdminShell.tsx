"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
import { SearchInput } from "@/shared/ui/SearchInput";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";
import { cn } from "@/shared/cn";

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  user?: { email?: string; username?: string } | null;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod || event.key.toLowerCase() !== "k") return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;

      if (isEditable && target !== searchRef.current) return;

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        <aside className="hidden h-full shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex lg:w-[72px] xl:w-64">
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
          <header className="flex shrink-0 items-center gap-4 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:px-6">
            <div className="mx-auto hidden w-full max-w-xl flex-1 lg:block">
              <SearchInput
                ref={searchRef}
                placeholder={t.admin.search}
                shortcut="⌘K"
                id="admin-search"
              />
            </div>
            <div className="ms-auto flex items-center gap-2 lg:hidden">
              <ProfileMenu />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-background p-4 lg:p-8">
            <div className="mb-6 text-center lg:mb-8 lg:text-start">
              <h1 className="text-lg font-semibold tracking-tight text-foreground lg:text-xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
