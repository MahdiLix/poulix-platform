"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";
import { AppHeader } from "@/shared/layout/AppHeader";
import { GlobalSearch } from "@/shared/search/GlobalSearch";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";

type TopBarProps = {
  showSearch?: boolean;
  className?: string;
  trailing?: ReactNode;
};

export function TopBar({
  showSearch = true,
  className,
  trailing,
}: TopBarProps) {
  const { t } = useLanguage();

  return (
    <AppHeader
      className={className}
      start={
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <BrandLogo size={32} />
          <span className="text-sm font-bold text-foreground">
            {t.common.appName}
          </span>
        </Link>
      }
      center={
        showSearch ? (
          <div className="mx-auto w-full max-w-xl">
            <GlobalSearch scope="app" />
          </div>
        ) : null
      }
      end={
        <div className="flex items-center gap-2">
          {trailing}
          <NotificationBell />
          <div className="hidden items-center gap-1 lg:flex">
            <ThemeToggle variant="compact" />
            <LanguageToggle variant="compact" />
          </div>
          <ProfileMenu />
        </div>
      }
    />
  );
}
