"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import {
  notificationCategoryClass,
  notificationContent,
} from "@/features/notifications/lib/notificationContent";
import type { Notification } from "@/features/notifications/lib/notifications";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function loadNotifications() {
    if (!getStoredToken()) {
      setPageStatus("unauthenticated");
      return;
    }

    setPageStatus("loading");
    setListError(null);

    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setPageStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        setPageStatus("unauthenticated");
        return;
      }
      setListError(localizeError(err, t.messages, "failedToLoadNotifications"));
      setPageStatus("error");
    }
  }

  async function markAsRead(notification: Notification) {
    if (notification.isRead) {
      return;
    }

    try {
      const updated = await api.markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
    } catch {
      // ignore mark-read errors silently
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.notifications.title}
        backHref="/"
        variant="hero"
        showNotifications={false}
        trailing={
          hasUnread ? (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingAll}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition hover:bg-white/20 disabled:opacity-60"
              aria-label={t.notifications.markAllRead}
            >
              <CheckCheck className="h-5 w-5" />
            </button>
          ) : null
        }
      />

      <div className="mt-2 flex flex-1 flex-col space-y-4 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t.notifications.subtitle}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.notifications.description}
            </p>
          </div>
        </div>

        {pageStatus === "loading" ? (
          <p className="py-8 text-center text-xs font-semibold text-muted">
            {t.notifications.loading}
          </p>
        ) : null}

        {pageStatus === "unauthenticated" ? (
          <Card className="space-y-3 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">
              {t.notifications.signInRequired}
            </p>
            <Link href="/login">
              <Button>{t.common.signIn}</Button>
            </Link>
          </Card>
        ) : null}

        {pageStatus === "error" ? (
          <Card className="space-y-3 p-6 text-center">
            <p className="text-sm font-semibold text-danger">{listError}</p>
            <Button onClick={() => void loadNotifications()}>
              {t.common.retry}
            </Button>
          </Card>
        ) : null}

        {pageStatus === "ready" && notifications.length === 0 ? (
          <Card className="space-y-2 p-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.notifications.emptyTitle}
            </p>
            <p className="text-xs text-muted">{t.notifications.emptySub}</p>
          </Card>
        ) : null}

        {pageStatus === "ready" && notifications.length > 0 ? (
          <ul className="space-y-3">
            {notifications.map((notification, index) => {
              const content = notificationContent(notification, t);
              return (
                <li
                  key={notification.id}
                  className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                    notification.isRead ? "opacity-75" : ""
                  }`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => void markAsRead(notification)}
                    className="w-full text-left rtl:text-right"
                  >
                    <Card
                      className={`space-y-2 p-4 transition hover:bg-surface-muted ${
                        notification.isRead ? "" : "ring-1 ring-primary/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">
                            {content.title}
                          </p>
                          <p className="text-xs text-muted">
                            {content.message}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${notificationCategoryClass(
                            notification.category,
                          )}`}
                        >
                          {t.notifications.categories[notification.category]}
                        </span>
                        <time className="text-[10px] font-medium text-muted">
                          {formatDisplayDateTime(
                            notification.createdAt,
                            language,
                          )}
                        </time>
                      </div>
                    </Card>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </AppShell>
  );
}
