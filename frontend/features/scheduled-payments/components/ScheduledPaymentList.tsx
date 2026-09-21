"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  Gift,
  Home,
  Laptop,
  Monitor,
  Pause,
  Play,
  XCircle,
  User,
} from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui/Table";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useRateLimitAction } from "@/shared/rate-limit";
import { formatScheduleDate } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  statusTone,
  type ScheduledPayment,
  type ScheduledPaymentFrequency,
} from "@/features/scheduled-payments/lib/scheduledPayments";

type ScheduledPaymentListProps = {
  payments: ScheduledPayment[];
  onStatusChange?: (
    id: string,
    action: "pause" | "resume" | "cancel",
  ) => Promise<void>;
};

function badgeVariant(
  tone: string,
): "success" | "warning" | "danger" | "muted" {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "danger") return "danger";
  return "muted";
}

function frequencyTone(
  frequency: ScheduledPaymentFrequency,
): "success" | "muted" {
  return frequency === "ONCE" ? "muted" : "success";
}

function paymentName(payment: ScheduledPayment): string {
  if (payment.reason) return payment.reason;
  if (payment.category) return payment.category;
  return `Payment to ${payment.recipientUser.username}`;
}

function paymentIcon(payment: ScheduledPayment, className: string): ReactNode {
  const reason = (payment.reason || "").toLowerCase();
  const category = (payment.category || "").toLowerCase();
  const lower = `${reason} ${category}`;
  if (
    lower.includes("rent") ||
    lower.includes("home") ||
    lower.includes("house")
  )
    return <Home className={className} />;
  if (
    lower.includes("laptop") ||
    lower.includes("computer") ||
    lower.includes("tech")
  )
    return <Laptop className={className} />;
  if (lower.includes("gift") || lower.includes("present"))
    return <Gift className={className} />;
  if (lower.includes("bank") || lower.includes("account"))
    return <Banknote className={className} />;
  return <User className={className} />;
}

function nextRunPayment(payments: ScheduledPayment[]): ScheduledPayment | null {
  const active = payments.filter(
    (p) => p.status === "ACTIVE" || p.status === "PAUSED",
  );
  if (active.length === 0) return null;
  return active.reduce(
    (min, p) => (p.nextExecutionAt < min.nextExecutionAt ? p : min),
    active[0],
  );
}

export function ScheduledPaymentList({
  payments,
  onStatusChange,
}: ScheduledPaymentListProps) {
  const { t, language } = useLanguage();
  const { blocked } = useRateLimitAction("scheduled");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const nextRun = useMemo(() => nextRunPayment(payments), [payments]);

  async function handleStatusChange(
    id: string,
    action: "pause" | "resume" | "cancel",
  ) {
    if (!onStatusChange) return;
    setPendingId(id);
    try {
      await onStatusChange(id, action);
    } finally {
      setPendingId(null);
    }
  }

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
    <div className="space-y-5">
      {nextRun ? (
        <div className="flex items-center gap-4 rounded-[14px] border border-success/20 bg-success-soft p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              Next run /{" "}
              <span className="text-success">
                <bdi>
                  {formatScheduleDate(nextRun.nextExecutionAt, language)}
                </bdi>
              </span>
              {" · "}
              <span className="text-success">
                {formatIrr(parseAmount(nextRun.amount))}
              </span>
              {" / "}
              <span className="truncate align-bottom">
                {paymentName(nextRun)}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="hidden lg:block">
        <Table>
          <TableHead>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Frequency</TableHeaderCell>
            <TableHeaderCell>Destination</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Next Execution</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            {payments.map((payment) => {
              const tone = statusTone(payment.status);
              const isPending = pendingId === payment.id;
              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted">
                        {paymentIcon(payment, "h-4 w-4")}
                      </div>
                      <span className="font-semibold text-foreground">
                        {paymentName(payment)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={frequencyTone(payment.frequency)}
                      className="font-normal capitalize"
                    >
                      {t.scheduled.frequencies[payment.frequency]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5" />
                      <span>{payment.recipientUser.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatIrr(parseAmount(payment.amount))}
                  </TableCell>
                  <TableCell className="text-xs text-muted">
                    <bdi>
                      {formatScheduleDate(payment.nextExecutionAt, language)}
                    </bdi>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant(tone)}>
                      {t.scheduled.statuses[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {payment.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={isPending || blocked}
                          onClick={() =>
                            void handleStatusChange(payment.id, "pause")
                          }
                          className="flex items-center gap-1 text-success hover:underline disabled:opacity-50"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          {t.scheduled.pauseBtn}
                        </button>
                      ) : payment.status === "PAUSED" ? (
                        <button
                          type="button"
                          disabled={isPending || blocked}
                          onClick={() =>
                            void handleStatusChange(payment.id, "resume")
                          }
                          className="flex items-center gap-1 text-warning hover:underline disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t.scheduled.resumeBtn}
                        </button>
                      ) : null}
                      {payment.status === "ACTIVE" ||
                      payment.status === "PAUSED" ? (
                        <button
                          type="button"
                          disabled={isPending || blocked}
                          onClick={() =>
                            void handleStatusChange(payment.id, "cancel")
                          }
                          className="flex items-center gap-1 text-danger hover:underline disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t.scheduled.cancelBtn}
                        </button>
                      ) : null}
                      <span className="text-muted">|</span>
                      <Link
                        href={`/scheduled/${payment.id}`}
                        className="text-success hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 lg:hidden">
        {payments.map((payment) => {
          const tone = statusTone(payment.status);
          const isPending = pendingId === payment.id;
          return (
            <div
              key={payment.id}
              className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface p-4 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted">
                    {paymentIcon(payment, "h-4 w-4")}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {paymentName(payment)}
                    </p>
                    <p className="text-xs text-muted">
                      {t.scheduled.frequencies[payment.frequency]} ·{" "}
                      {payment.recipientUser.username}
                    </p>
                  </div>
                </div>
                <Badge variant={badgeVariant(tone)}>
                  {t.scheduled.statuses[payment.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="amount font-bold">
                  {formatIrr(parseAmount(payment.amount))}
                </span>
                <span className="text-xs text-muted">
                  <bdi>
                    {formatScheduleDate(payment.nextExecutionAt, language)}
                  </bdi>
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 text-xs font-semibold">
                {payment.status === "ACTIVE" ? (
                  <button
                    type="button"
                    disabled={isPending || blocked}
                    onClick={() => void handleStatusChange(payment.id, "pause")}
                    className="flex items-center gap-1 text-success hover:underline disabled:opacity-50"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    {t.scheduled.pauseBtn}
                  </button>
                ) : payment.status === "PAUSED" ? (
                  <button
                    type="button"
                    disabled={isPending || blocked}
                    onClick={() =>
                      void handleStatusChange(payment.id, "resume")
                    }
                    className="flex items-center gap-1 text-warning hover:underline disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t.scheduled.resumeBtn}
                  </button>
                ) : null}
                {payment.status === "ACTIVE" || payment.status === "PAUSED" ? (
                  <button
                    type="button"
                    disabled={isPending || blocked}
                    onClick={() =>
                      void handleStatusChange(payment.id, "cancel")
                    }
                    className="flex items-center gap-1 text-danger hover:underline disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t.scheduled.cancelBtn}
                  </button>
                ) : null}
                <span className="text-muted">|</span>
                <Link
                  href={`/scheduled/${payment.id}`}
                  className="text-success hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted text-[10px]">
          i
        </span>
        Failed executions appear in History and Notifications.
      </p>
    </div>
  );
}
