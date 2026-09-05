"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  X,
} from "lucide-react";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import {
  notificationCategoryClass,
  notificationContent,
} from "@/features/notifications/lib/notificationContent";
import type { Notification } from "@/features/notifications/lib/notifications";

export function NotificationBell({
  className,
  hrefWhenGuest = "/login",
}: {
  className?: string;
  hrefWhenSignedIn?: string;
  hrefWhenGuest?: string;
}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setIsSignedIn(false);
      setUnreadCount(0);
      return;
    }

    setIsSignedIn(true);

    try {
      const { count } = await api.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      if (!getStoredToken()) {
        setIsSignedIn(false);
        setUnreadCount(0);
      }
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!getStoredToken()) return;
    setLoadingList(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.slice(0, 8));
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const interval = window.setInterval(() => void refreshUnread(), 30_000);
    return () => window.clearInterval(interval);
  }, [refreshUnread]);

  useEffect(() => {
    if (isOpen) {
      void loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleToggle() {
    if (!isSignedIn) {
      router.push(hrefWhenGuest);
      return;
    }
    setIsOpen((prev) => !prev);
  }

  async function handleMarkRead(
    notification: Notification,
    e: React.MouseEvent,
  ) {
    e.stopPropagation();
    if (notification.isRead) return;

    try {
      const updated = await api.markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function getCategoryIcon(category: Notification["category"]) {
    switch (category) {
      case "SUCCESS":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-sky-500 shrink-0" />;
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => void handleToggle()}
        className={
          className ??
          "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-foreground transition hover:bg-surface-muted active:scale-95"
        }
        aria-label="Toggle notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface animate-in fade-in zoom-in duration-300 rtl:right-auto rtl:left-1.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-3xl border border-border bg-surface p-4 text-foreground shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 sm:absolute sm:inset-x-auto sm:top-12 sm:end-0 sm:w-96">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{t.notifications.title}</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary">
                  {unreadCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-muted hover:text-foreground transition cursor-pointer"
                  title={t.notifications.markAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t.notifications.markAllRead}
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-surface-muted hover:text-foreground transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/50 py-2">
            {loadingList ? (
              <div className="py-8 text-center text-xs text-muted">
                {t.notifications.loading}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Bell className="mx-auto h-8 w-8 text-muted/40" />
                <p className="text-xs font-semibold text-foreground">
                  {t.notifications.emptyTitle}
                </p>
                <p className="text-[11px] text-muted">
                  {t.notifications.emptySub}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const content = notificationContent(item, t);
                return (
                  <div
                    key={item.id}
                    onClick={(e) => void handleMarkRead(item, e)}
                    className={`flex items-start gap-3 p-2.5 rounded-2xl transition cursor-pointer hover:bg-surface-muted ${
                      item.isRead
                        ? "opacity-75"
                        : "bg-primary-soft/20 font-medium"
                    }`}
                  >
                    <div className="mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {content.title}
                        </p>
                        {!item.isRead ? (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {content.message}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${notificationCategoryClass(
                            item.category,
                          )}`}
                        >
                          {t.notifications.categories[item.category]}
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          {formatDisplayDateTime(item.createdAt, language)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border pt-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <span>{t.notifications.title}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
