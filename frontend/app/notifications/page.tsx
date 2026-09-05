"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  PiggyBank,
  Send,
  Shield,
  Target,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { cn } from "@/shared/cn";
import {
  notificationCategoryClass,
  notificationContent,
} from "@/features/notifications/lib/notificationContent";
import type {
  Notification,
  NotificationCategory,
  NotificationType,
} from "@/features/notifications/lib/notifications";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";
type Filter = "ALL" | NotificationCategory;

const FILTERS: Filter[] = ["ALL", "SUCCESS", "WARNING", "ERROR", "INFO"];

function notificationIcon(type: NotificationType) {
  switch (type) {
    case "DEPOSIT_SUCCESS":
      return ArrowDownLeft;
    case "WITHDRAWAL_SUCCESS":
      return ArrowUpRight;
    case "TRANSFER_SUCCESS":
    case "TRANSFER_FAILED":
      return Send;
    case "TRANSFER_RECEIVED":
      return ArrowDownLeft;
    case "SCHEDULED_PAYMENT_SUCCESS":
    case "SCHEDULED_PAYMENT_FAILED":
      return CalendarClock;
    case "GOAL_PROGRESS":
      return Target;
    case "GOAL_COMPLETED":
      return PiggyBank;
    case "SECURITY_WARNING":
      return Shield;
    case "SPENDING_LIMIT_WARNING":
      return AlertTriangle;
    default:
      return Wallet;
  }
}

function iconTileClass(category: NotificationCategory) {
  switch (category) {
    case "SUCCESS":
      return "bg-primary-soft text-primary";
    case "WARNING":
      return "bg-warning-soft text-warning";
    case "ERROR":
      return "bg-danger-soft text-danger";
    default:
      return "bg-surface-muted text-muted";
  }
}

function filterDotClass(filter: Filter) {
  switch (filter) {
    case "SUCCESS":
      return "bg-primary";
    case "WARNING":
      return "bg-warning";
    case "ERROR":
      return "bg-danger";
    case "INFO":
      return "bg-muted";
    default:
      return "";
  }
}

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

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
  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? notifications
        : notifications.filter((item) => item.category === filter),
    [filter, notifications],
  );

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.notifications.title}
        backHref="/"
        subtitle={t.notifications.subtitle}
        showNotifications={false}
        trailing={
          hasUnread ? (
            <Button
              variant="outline"
              size="sm"
              className="w-auto gap-1.5"
              disabled={markingAll}
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t.notifications.markAllRead}</span>
            </Button>
          ) : null
        }
      />

      <div className="mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:max-w-5xl lg:p-6">
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
            <ButtonLink href="/login">{t.common.signIn}</ButtonLink>
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

        {pageStatus === "ready" ? (
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
              {FILTERS.map((item) => {
                const active = filter === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {item !== "ALL" && !active ? (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          filterDotClass(item),
                        )}
                      />
                    ) : null}
                    {item === "ALL"
                      ? t.notifications.filterAll
                      : t.notifications.categories[item]}
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <div className="space-y-1 px-5 py-10 text-center">
                <p className="text-sm font-bold text-foreground">
                  {t.notifications.emptyTitle}
                </p>
                <p className="text-xs text-muted">{t.notifications.emptySub}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((notification) => {
                  const content = notificationContent(notification, t);
                  const Icon = notificationIcon(notification.type);
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markAsRead(notification)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-start transition hover:bg-surface-muted"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]",
                          iconTileClass(notification.category),
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">
                          {content.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {content.message}
                        </p>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${notificationCategoryClass(
                          notification.category,
                        )}`}
                      >
                        {t.notifications.categories[notification.category]}
                      </span>
                      <time className="hidden shrink-0 text-[11px] font-medium text-muted md:block">
                        {formatDisplayDateTime(
                          notification.createdAt,
                          language,
                        )}
                      </time>
                      {!notification.isRead ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="hidden text-[10px] font-bold uppercase tracking-wide text-primary lg:inline">
                            {t.notifications.unread}
                          </span>
                        </span>
                      ) : (
                        <span className="h-2 w-2 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
