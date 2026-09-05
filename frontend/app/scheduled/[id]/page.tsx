"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  statusTone,
  type ScheduledPayment,
} from "@/features/scheduled-payments/lib/scheduledPayments";
import {
  isTransactionCategory,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";

export default function ScheduledPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [payment, setPayment] = useState<ScheduledPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadPayment();
  }, [params.id]);

  async function loadPayment() {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getScheduledPayment(params.id);
      setPayment(data);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadScheduledPayments"));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    action: "pause" | "resume" | "cancel",
  ): Promise<void> {
    if (!payment) return;

    setActionLoading(true);
    setError(null);

    try {
      const updated = await api.updateScheduledPaymentStatus(
        payment.id,
        action,
      );
      setPayment({
        ...updated,
        executions: payment.executions,
      });
      await loadPayment();
    } catch (err) {
      setError(localizeError(err, t.messages, "scheduledPaymentActionFailed"));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.scheduled.detailTitle} backHref="/scheduled" />
        <p className="p-8 text-center text-xs font-semibold text-muted">
          {t.scheduled.loading}
        </p>
      </AppShell>
    );
  }

  if (!payment) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.scheduled.detailTitle} backHref="/scheduled" />
        <div className="space-y-3 p-6">
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
            {error || t.messages.genericError}
          </div>
          <Button variant="secondary" onClick={() => void loadPayment()}>
            {t.common.retry}
          </Button>
        </div>
      </AppShell>
    );
  }

  const tone = statusTone(payment.status);
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
        : tone === "danger"
          ? "bg-danger-soft text-danger"
          : "bg-surface-muted text-muted";

  const categoryLabel =
    payment.category && isTransactionCategory(payment.category)
      ? t.history.categories[payment.category as TransactionCategory]
      : null;

  const canPause = payment.status === "ACTIVE";
  const canResume = payment.status === "PAUSED";
  const canCancel = payment.status === "ACTIVE" || payment.status === "PAUSED";

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.scheduled.detailTitle} backHref="/scheduled" />

      <div className="space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-5xl">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${toneClass}`}
            >
              {t.scheduled.statuses[payment.status]}
            </span>
            <span className="text-xs font-semibold text-muted">
              {t.scheduled.frequencies[payment.frequency]}
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.send.recipientLabel}
            </p>
            <p className="text-sm font-bold text-foreground">
              {payment.recipientUser.username}
            </p>
            <p className="text-xs font-medium text-muted">
              {payment.recipientUser.email}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.send.amountLabel}
            </p>
            <p className="text-xl font-extrabold text-foreground">
              {formatIrr(parseAmount(payment.amount))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
            <div>
              <p className="font-semibold text-muted">
                {t.scheduled.startDate}
              </p>
              <p className="font-bold text-foreground">
                {formatDisplayDate(payment.startDate, language)}
              </p>
            </div>
            <div>
              <p className="font-semibold text-muted">
                {t.scheduled.nextExecution}
              </p>
              <p className="font-bold text-foreground">
                {formatDisplayDate(payment.nextExecutionAt, language)}
              </p>
            </div>
          </div>

          {categoryLabel || payment.reason ? (
            <div className="border-t border-border pt-4 text-xs">
              {categoryLabel ? (
                <p className="font-semibold text-muted">
                  {t.history.categoryLabel}:{" "}
                  <span className="text-foreground">{categoryLabel}</span>
                </p>
              ) : null}
              {payment.reason ? (
                <p className="mt-1 font-semibold text-muted">
                  {t.history.reasonLabel}:{" "}
                  <span className="text-foreground">{payment.reason}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {error ? (
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {canPause ? (
            <Button
              variant="secondary"
              disabled={actionLoading}
              onClick={() => void runAction("pause")}
            >
              {t.scheduled.pauseBtn}
            </Button>
          ) : null}
          {canResume ? (
            <Button
              variant="secondary"
              disabled={actionLoading}
              onClick={() => void runAction("resume")}
            >
              {t.scheduled.resumeBtn}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="secondary"
              disabled={actionLoading}
              onClick={() => void runAction("cancel")}
            >
              {t.scheduled.cancelBtn}
            </Button>
          ) : null}
        </div>

        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-foreground">
            {t.scheduled.executionHistory}
          </h3>

          {!payment.executions || payment.executions.length === 0 ? (
            <p className="text-xs font-medium text-muted">
              {t.scheduled.noExecutions}
            </p>
          ) : (
            <div className="space-y-2">
              {payment.executions.map((execution) => (
                <div
                  key={execution.id}
                  className="rounded-xl bg-surface-muted p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">
                      {formatDisplayDateTime(execution.executedAt, language)}
                    </span>
                    <span
                      className={
                        execution.status === "SUCCESS"
                          ? "font-bold text-success"
                          : "font-bold text-danger"
                      }
                    >
                      {execution.status === "SUCCESS"
                        ? t.scheduled.executionSuccess
                        : t.scheduled.executionFailed}
                    </span>
                  </div>
                  {execution.failureReason ? (
                    <p className="mt-1 font-medium text-muted">
                      {execution.failureReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
