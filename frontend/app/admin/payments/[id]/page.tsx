"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Landmark } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Badge } from "@/shared/ui/Badge";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { transactionTypeLabel } from "@/features/wallet/lib/transactionDisplay";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminPaymentDetail } from "@/features/admin/lib/admin";

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "danger";
  return "muted";
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [item, setItem] = useState<AdminPaymentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminPayment(id)
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
    <AdminShell title={t.admin.paymentsTitle}>
      {error ? (
        <Card className="p-4 text-sm text-danger">{error}</Card>
      ) : !item ? (
        <PageSpinner label={t.common.loading} />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {formatIrr(item.amount)}
                  </p>
                  <p className="text-sm text-muted">
                    {item.user.username} · {item.user.email}
                  </p>
                  <div className="mt-2">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                </div>
              </div>
              <ButtonLink
                href={`/admin/users/${item.user.id}`}
                size="sm"
                variant="secondary"
                className="w-auto"
              >
                {t.admin.userDetailTitle}
              </ButtonLink>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4">
              <p className="text-[11px] font-semibold text-muted">Gateway</p>
              <p className="mt-1 text-sm font-bold">ZarinPal</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold text-muted">Reference</p>
              <p className="mt-1 break-all font-mono text-xs font-bold">
                {item.refId ?? "—"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold text-muted">Wallet ID</p>
              <p className="mt-1 break-all font-mono text-xs font-bold">
                {item.walletId}
              </p>
            </Card>
          </div>

          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <DetailRow label="Payment ID" value={item.id} mono />
            <DetailRow
              label="Created"
              value={formatDisplayDateTime(item.createdAt, language)}
            />
            <DetailRow
              label="Updated"
              value={formatDisplayDateTime(item.updatedAt, language)}
            />
            <DetailRow label={t.admin.status} value={item.status} />
            <DetailRow
              label="User"
              value={`${item.user.username} (${item.user.email})`}
            />
            <DetailRow label="Amount" value={formatIrr(item.amount)} />
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Related transaction</h2>
            {item.relatedTransaction ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {transactionTypeLabel(item.relatedTransaction.type, t)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatIrr(item.relatedTransaction.amount)} ·{" "}
                      {formatDisplayDateTime(
                        item.relatedTransaction.createdAt,
                        language,
                      )}
                    </p>
                  </div>
                </div>
                <ButtonLink
                  href={`/admin/transactions/${item.relatedTransaction.id}`}
                  size="sm"
                  variant="outline"
                  className="w-auto"
                >
                  View
                </ButtonLink>
              </div>
            ) : (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
