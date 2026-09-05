"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { SearchInput } from "@/shared/ui/SearchInput";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";
import { cn } from "@/shared/cn";

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
  const router = useRouter();
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

      if (isEditable && target !== searchRef.current) {
        return;
      }

      event.preventDefault();
      if (!showSearch) {
        router.push("/history");
        return;
      }
      searchRef.current?.focus();
      searchRef.current?.select();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, showSearch]);

  return (
    <header
      className={cn(
        "relative z-50 flex items-center gap-4 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:px-6",
        className,
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2 lg:hidden"
      >
        <BrandLogo size={32} />
        <span className="text-sm font-bold text-foreground">
          {t.common.appName}
        </span>
      </Link>

      {showSearch ? (
        <div className="hidden flex-1 lg:block">
          <div className="mx-auto max-w-xl">
            <SearchInput
              ref={searchRef}
              id="global-search"
              placeholder={t.home.searchPlaceholder}
              shortcut="⌘K"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const value = event.currentTarget.value.trim();
                  router.push(
                    value
                      ? `/history?q=${encodeURIComponent(value)}`
                      : "/history",
                  );
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 lg:block" />
      )}

      <div className="ms-auto flex items-center gap-2">
        {trailing}
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
