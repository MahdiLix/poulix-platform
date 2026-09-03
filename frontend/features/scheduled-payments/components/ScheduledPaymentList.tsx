"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  statusTone,
  type ScheduledPayment,
} from "@/features/scheduled-payments/lib/scheduledPayments";

type ScheduledPaymentListProps = {
  payments: ScheduledPayment[];
};

export function ScheduledPaymentList({ payments }: ScheduledPaymentListProps) {
  const { t, language } = useLanguage();

  if (payments.length === 0) {
    return (
      <div className="space-y-3 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
          <CalendarClock className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-foreground">
          {t.scheduled.emptyTitle}
        </p>
        <p className="mx-auto max-w-[240px] text-xs text-muted">
          {t.scheduled.emptySub}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const tone = statusTone(payment.status);
        const toneClass =
          tone === "success"
            ? "bg-success-soft text-success"
            : tone === "warning"
              ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
              : tone === "danger"
                ? "bg-danger-soft text-danger"
                : "bg-surface-muted text-muted";

        return (
          <Link key={payment.id} href={`/scheduled/${payment.id}`}>
            <Card className="flex items-center justify-between rounded-2xl p-4 transition hover:shadow-md">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${toneClass}`}
                  >
                    {t.scheduled.statuses[payment.status]}
                  </span>
                  <span className="text-[11px] font-medium text-muted">
                    {t.scheduled.frequencies[payment.frequency]}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatIrr(parseAmount(payment.amount))} →{" "}
                  {payment.recipientUser.username}
                </p>
                <p className="text-[11px] font-medium text-muted">
                  {t.scheduled.nextExecution}:{" "}
                  {formatDisplayDate(payment.nextExecutionAt, language)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
