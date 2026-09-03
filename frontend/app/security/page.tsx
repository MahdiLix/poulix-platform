"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Smartphone } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatIrr } from "@/features/wallet/lib/wallet";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type {
  SecurityEvent,
  UserSession,
} from "@/features/security/lib/security";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function SecurityPage() {
  const { t, language } = useLanguage();
  const [limits, setLimits] = useState<SpendingLimitSummary[]>([]);
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [savingType, setSavingType] = useState<string | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    if (!getStoredToken()) {
      setPageStatus("unauthenticated");
      return;
    }

    if (pageStatus !== "ready") {
      setPageStatus("loading");
    }
    setError(null);

    try {
      const [limitsData, sessionsData, eventsData] = await Promise.all([
        api.getSpendingLimits(),
        api.getSecuritySessions(),
        api.getSecurityEvents(),
      ]);
      setLimits(limitsData);
      setLimitDrafts(
        Object.fromEntries(
          limitsData.map((limit) => [limit.type, String(limit.maxAmount)]),
        ),
      );
      setSessions(sessionsData);
      setEvents(eventsData);
      setPageStatus("ready");
      void api.touchSecuritySession();
    } catch (err) {
      if (!getStoredToken()) {
        setPageStatus("unauthenticated");
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
    const parsed = Number(limitDrafts[type]);
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

  function usagePercent(limit: SpendingLimitSummary) {
    if (limit.maxAmount <= 0) return 0;
    return Math.min(100, (limit.usedAmount / limit.maxAmount) * 100);
  }

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.security.title} backHref="/" />

      <div className="flex flex-1 flex-col space-y-4 p-6 lg:mx-auto lg:max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{t.security.subtitle}</h2>
            <p className="text-xs text-muted">{t.security.description}</p>
          </div>
        </div>

        {pageStatus === "unauthenticated" ? (
          <Card className="p-6 text-center">
            <p className="text-sm font-semibold">{t.security.signInRequired}</p>
            <Link href="/login" className="mt-3 inline-block">
              <Button>{t.common.signIn}</Button>
            </Link>
          </Card>
        ) : null}

        {error ? (
          <Card className="p-4 text-center text-sm text-danger">{error}</Card>
        ) : null}

        {pageStatus === "ready" ? (
          <>
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold">{t.security.limitsTitle}</h3>
              <ul className="space-y-3">
                {limits.map((limit) => {
                  const percent = usagePercent(limit);
                  const warning = percent >= 80;
                  return (
                    <li key={limit.type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">
                          {limitLabel(limit.type)}
                        </span>
                        <span
                          className={warning ? "text-amber-600" : "text-muted"}
                        >
                          {formatIrr(limit.usedAmount, limit.currency)} /{" "}
                          {formatIrr(limit.maxAmount, limit.currency)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-muted">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            warning ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted">
                        {t.security.remaining}:{" "}
                        {formatIrr(limit.remainingAmount, limit.currency)}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
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
                          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                        />
                        <Button
                          variant="secondary"
                          disabled={savingType === limit.type}
                          onClick={() => void saveLimit(limit.type)}
                        >
                          {savingType === limit.type
                            ? t.security.savingLimit
                            : t.security.saveLimit}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {t.security.sessionsTitle}
              </h3>
              {sessions.length === 0 ? (
                <p className="text-xs text-muted">{t.security.noSessions}</p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center justify-between rounded-xl bg-surface-muted p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {session.deviceLabel ?? t.security.unknownDevice}
                        </p>
                        <p className="text-[10px] text-muted">
                          {formatDisplayDateTime(session.lastSeenAt, language)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => void revokeSession(session.id)}
                      >
                        {t.security.revoke}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold">{t.security.eventsTitle}</h3>
              {events.length === 0 ? (
                <p className="text-xs text-muted">{t.security.noEvents}</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl bg-surface-muted p-3 text-xs"
                    >
                      <p className="font-semibold">
                        {t.security.eventTypes[event.type]}
                      </p>
                      <p className="text-muted">
                        {formatDisplayDateTime(event.createdAt, language)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
