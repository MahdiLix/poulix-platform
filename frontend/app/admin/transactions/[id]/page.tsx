"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Card } from "@/shared/ui/Card";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminTransactionDetail } from "@/features/admin/lib/admin";

export default function AdminTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [item, setItem] = useState<AdminTransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminTransaction(id)
      .then((data) => {
        if (!cancelled) {
          setItem(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(localizeError(err, t.messages, "failedToLoadAdmin"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, t.messages]);

  return (
    <AdminShell title={t.admin.transactionsTitle}>
      {error ? (
        <Card className="p-4 text-sm text-danger">{error}</Card>
      ) : !item ? (
        <PageSpinner label={t.common.loading} />
      ) : (
        <Card className="space-y-2 p-4 text-sm">
          <p className="text-lg font-bold">
            {item.type} · {formatIrr(item.amount)}
          </p>
          <p>
            {t.admin.role}: {item.user.username} · {item.user.email}
          </p>
          <p className="text-xs text-muted">
            {formatDisplayDateTime(item.createdAt, language)}
          </p>
          {item.reason ? (
            <p>
              {t.history.reasonLabel}: {item.reason}
            </p>
          ) : null}
          {item.counterparty ? (
            <p>
              {item.counterparty.username} ({item.counterparty.id})
            </p>
          ) : null}
          {item.relatedTransaction ? (
            <Link
              href={`/admin/transactions/${item.relatedTransaction.id}`}
              className="block text-primary"
            >
              {item.relatedTransaction.type} ·{" "}
              {formatIrr(item.relatedTransaction.amount)}
            </Link>
          ) : null}
          {item.scheduledPaymentExecution ? (
            <p className="text-xs">
              {item.scheduledPaymentExecution.status}
              {item.scheduledPaymentExecution.failureReason
                ? ` · ${item.scheduledPaymentExecution.failureReason}`
                : ""}
            </p>
          ) : null}
          {item.goalId ? (
            <p className="text-xs text-muted">goal: {item.goalId}</p>
          ) : null}
          {item.envelopeId ? (
            <p className="text-xs text-muted">envelope: {item.envelopeId}</p>
          ) : null}
          <Link
            href={`/admin/users/${item.user.id}`}
            className="inline-block pt-2 text-xs font-semibold text-primary"
          >
            {t.admin.userDetailTitle}
          </Link>
        </Card>
      )}
    </AdminShell>
  );
}
