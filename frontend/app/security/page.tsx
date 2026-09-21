"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Monitor, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Pagination } from "@/shared/ui/Pagination";
import { TextField } from "@/shared/ui/TextField";
import { api, ApiRequestError } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { useRateLimitAction, withRemainingLabel } from "@/shared/rate-limit";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type {
  SecurityEvent,
  SecurityEventType,
  UserSession,
} from "@/features/security/lib/security";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

type EventSeverity = "warning" | "failed" | "info";
const EVENTS_PAGE_SIZE = 6;

function eventSeverity(type: SecurityEventType): EventSeverity {
  switch (type) {
    case "FAILED_LOGIN":
    case "FAILED_TRANSFER":
    case "FAILED_WITHDRAWAL":
      return "failed";
    case "LIMIT_EXCEEDED":
    case "SUSPICIOUS_ACTIVITY":
      return "warning";
    case "NEW_DEVICE_LOGIN":
    case "SESSION_REVOKED":
    default:
      return "info";
  }
}

function eventIcon(type: SecurityEventType, className: string): ReactNode {
  switch (eventSeverity(type)) {
    case "failed":
    case "warning":
      return <ShieldAlert className={className} />;
    case "info":
    default:
      return <ShieldCheck className={className} />;
  }
}

function sessionIcon(label: string | null, className: string): ReactNode {
  const lower = (label || "").toLowerCase();
  if (
    lower.includes("mobile") ||
    lower.includes("phone") ||
    lower.includes("android") ||
    lower.includes("ios")
  ) {
    return <Smartphone className={className} />;
  }
  return <Monitor className={className} />;
}

function severityBadgeVariant(
  severity: EventSeverity,
): "warning" | "danger" | "muted" {
  switch (severity) {
    case "warning":
      return "warning";
    case "failed":
      return "danger";
    case "info":
    default:
      return "muted";
  }
}

function severityLabel(severity: EventSeverity, language: "en" | "fa"): string {
  if (language === "fa") {
    if (severity === "warning") return "هشدار";
    if (severity === "failed") return "ناموفق";
    return "اطلاعات";
  }
  switch (severity) {
    case "warning":
      return "Warning";
    case "failed":
      return "Failed";
    case "info":
    default:
      return "Info";
  }
}

export default function SecurityPage() {
  const { t, language } = useLanguage();
  const { status: authStatus } = useUser();
  const { blocked, remainingSeconds } = useRateLimitAction("securityLimits");
  const [limits, setLimits] = useState<SpendingLimitSummary[]>([]);
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      setLimits([]);
      setSessions([]);
      setEvents([]);
      setEventsTotal(0);
      setPageStatus("ready");
      return;
    }
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, eventsPage]);

  async function loadData() {
    if (pageStatus !== "ready") {
      setPageStatus("loading");
    }
    setError(null);

    try {
      const [limitsData, sessionsData, eventsData] = await Promise.all([
        api.getSpendingLimits(),
        api.getSecuritySessions(),
        api.getSecurityEventsPage({
          page: eventsPage,
          pageSize: EVENTS_PAGE_SIZE,
        }),
      ]);
      setLimits(limitsData);
      setLimitDrafts(
        Object.fromEntries(
          limitsData.map((limit) => [limit.type, String(limit.maxAmount)]),
        ),
      );
      setSessions(sessionsData);
      setEvents(eventsData.items);
      setEventsTotal(eventsData.total);
      setPageStatus("ready");
      void api.touchSecuritySession().catch(() => {});
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setPageStatus("ready");
        return;
      }
      setError(localizeError(err, t.messages, "failedToLoadSecurity"));
      setPageStatus("error");
    }
  }

  async function revokeSession(id: string) {
    await api.revokeSecuritySession(id);
    await loadData();
  }

  async function saveLimit(type: SpendingLimitSummary["type"]) {
    const parsed = parseAmount(limitDrafts[type]);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError(t.messages.genericError);
      return;
    }

    setSavingType(type);
    setError(null);
    try {
      await api.updateSpendingLimit({ type, maxAmount: parsed });
      await loadData();
    } catch (err) {
      setError(localizeError(err, t.messages, "genericError"));
    } finally {
      setSavingType(null);
    }
  }

  function limitLabel(type: SpendingLimitSummary["type"]) {
    return t.security.limitTypes[type];
  }

  function limitShortLabel(type: SpendingLimitSummary["type"]): string {
    return limitLabel(type);
  }

  function usagePercent(limit: SpendingLimitSummary) {
    if (limit.maxAmount <= 0) return 0;
    return Math.min(100, (limit.usedAmount / limit.maxAmount) * 100);
  }

  return (
    <AppShell showBottomNav={false} showTopBar={false}>
      <HeaderBar
        title={t.security.title}
        backHref="/"
        subtitle={t.security.description}
      />

      <div className="flex flex-1 flex-col space-y-6 p-4 lg:mx-auto lg:max-w-5xl lg:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          {t.security.limitsTitle}
        </p>

        {error ? (
          <Card className="p-4 text-center text-sm text-danger">{error}</Card>
        ) : null}

        {pageStatus === "ready" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {limits.map((limit) => {
                const percent = usagePercent(limit);
                const warning = percent >= 80;
                return (
                  <Card key={limit.type} className="space-y-4 p-5">
                    <h3 className="text-sm font-bold text-foreground">
                      {limitShortLabel(limit.type)}
                    </h3>
                    <p className="amount text-lg font-bold text-success">
                      {formatIrr(limit.usedAmount, limit.currency)}{" "}
                      <span className="text-sm font-medium text-muted">
                        / {formatIrr(limit.maxAmount, limit.currency)}
                      </span>
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          warning ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-muted">
                      {t.security.remaining}:{" "}
                      <span className="amount">
                        {formatIrr(limit.remainingAmount, limit.currency)}
                      </span>
                    </p>
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <TextField
                          label="Limit (IRR)"
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={limitDrafts[limit.type] ?? ""}
                          onChange={(e) =>
                            setLimitDrafts((current) => ({
                              ...current,
                              [limit.type]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        className="h-10 w-auto shrink-0 px-4"
                        disabled={savingType === limit.type || blocked}
                        onClick={() => void saveLimit(limit.type)}
                      >
                        {savingType === limit.type
                          ? t.security.savingLimit
                          : withRemainingLabel(
                              t.security.saveLimit,
                              remainingSeconds,
                            )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-4 p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {t.security.sessionsTitle}
                </h3>
                {sessions.length === 0 ? (
                  <p className="text-xs text-muted">{t.security.noSessions}</p>
                ) : (
                  <ul className="space-y-3">
                    {sessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/70 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                            {sessionIcon(session.deviceLabel, "h-5 w-5")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {session.deviceLabel ?? t.security.unknownDevice}
                            </p>
                            <p className="text-[11px] text-muted">
                              {[
                                session.environment?.browser,
                                session.environment?.os,
                                session.environment?.device,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                formatDisplayDateTime(
                                  session.lastSeenAt,
                                  language,
                                )}
                            </p>
                            <p className="text-[11px] text-muted">
                              {formatDisplayDateTime(
                                session.lastSeenAt,
                                language,
                              )}
                            </p>
                          </div>
                        </div>
                        {session.isCurrent ? (
                          <Badge variant="success">
                            {language === "fa" ? "این دستگاه" : "This device"}
                          </Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void revokeSession(session.id)}
                            className="shrink-0 text-xs font-semibold text-danger hover:underline"
                          >
                            {t.security.revoke}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="space-y-4 p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {t.security.eventsTitle}
                </h3>
                {events.length === 0 ? (
                  <p className="text-xs text-muted">{t.security.noEvents}</p>
                ) : (
                  <ul className="space-y-3">
                    {events.map((event) => {
                      const severity = eventSeverity(event.type);
                      return (
                        <li
                          key={event.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/70 p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                severity === "failed"
                                  ? "bg-danger-soft text-danger"
                                  : severity === "warning"
                                    ? "bg-warning-soft text-warning"
                                    : "bg-primary-soft text-primary"
                              }`}
                            >
                              {eventIcon(event.type, "h-5 w-5")}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {t.security.eventTypes[event.type]}
                              </p>
                              <p className="text-[11px] text-muted">
                                {formatDisplayDateTime(
                                  event.createdAt,
                                  language,
                                )}
                              </p>
                            </div>
                          </div>
                          <Badge variant={severityBadgeVariant(severity)}>
                            {severityLabel(severity, language)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Pagination
                  page={eventsPage}
                  totalPages={Math.max(
                    1,
                    Math.ceil(eventsTotal / EVENTS_PAGE_SIZE),
                  )}
                  onPageChange={setEventsPage}
                />
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
