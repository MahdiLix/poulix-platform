"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Shield,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { useUser, useUserInitials } from "@/shared/user/UserProvider";
import { getDisplayName } from "@/shared/user/displayName";
import { cn } from "@/shared/cn";

type ProfileMenuProps = {
  triggerClassName?: string;
  avatarSize?: "sm" | "md";
  showLabel?: boolean;
  label?: ReactNode;
};

export function ProfileMenu({
  triggerClassName,
  avatarSize = "sm",
  showLabel = false,
  label,
}: ProfileMenuProps) {
  const { t, language } = useLanguage();
  const { user, status, signOut } = useUser();
  const initials = useUserInitials(user);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === "ADMIN";
  const displayName = getDisplayName(user, t.common.guestUser);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  if (status === "unauthenticated" && !user) {
    return (
      <Link
        href="/login"
        className={cn(
          "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]",
          triggerClassName,
        )}
      >
        {initials}
      </Link>
    );
  }

  const sizeClass =
    avatarSize === "md" ? "h-9 w-9 text-xs" : "h-9 w-9 text-[11px]";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-[10px] transition hover:opacity-90 active:scale-[0.98]",
          showLabel && "w-full px-2 py-2 hover:bg-sidebar-hover",
          triggerClassName,
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
            sizeClass,
          )}
        >
          {initials}
        </span>
        {showLabel ? (
          <span className="hidden min-w-0 flex-1 text-start xl:block">
            <span className="block truncate text-xs font-semibold text-sidebar-foreground">
              {displayName}
            </span>
            <span className="block truncate text-[10px] text-sidebar-muted">
              {user?.email ?? ""}
            </span>
          </span>
        ) : null}
        {label}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={t.nav.profile}
            className={cn(
              "fixed top-0 z-50 flex h-dvh w-[min(18rem,88vw)] flex-col border-border bg-surface shadow-xl animate-in",
              // English: open from the right. Persian: open from the left.
              language === "fa"
                ? "left-0 border-r"
                : "right-0 border-l",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              <div className="space-y-2 rounded-[12px] border border-border bg-surface-muted/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-foreground">
                    {t.common.appearance}
                  </span>
                  <ThemeToggle variant="compact" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-foreground">
                    {t.common.language}
                  </span>
                  <LanguageToggle variant="compact" />
                </div>
              </div>

              {isAdmin ? (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary-soft hover:text-primary"
                  >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    {t.admin.openAdmin}
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary-soft hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4 text-primary rtl:rotate-180" />
                    {t.admin.backToApp}
                  </Link>
                </>
              ) : null}

              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary-soft hover:text-primary"
              >
                <User className="h-4 w-4 text-primary" />
                {t.nav.profile}
              </Link>

              <Link
                href="/security"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary-soft hover:text-primary"
              >
                <Shield className="h-4 w-4 text-primary" />
                {t.security.title}
              </Link>
            </div>
            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" />
                {t.common.logOut}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
