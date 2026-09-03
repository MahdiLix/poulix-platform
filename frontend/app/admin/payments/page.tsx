"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminPayment } from "@/features/admin/lib/admin";

export default function AdminPaymentsPage() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminPayments({ q, status, page })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(localizeError(err, t.messages, "failedToLoadAdmin"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, status, page, t.messages]);

  return (
    <AdminShell title={t.admin.paymentsTitle}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <TextField
          label={t.admin.search}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <Select
          label={t.admin.status}
          value={status}
          onChange={(val) => {
            setPage(1);
            setStatus(val);
          }}
          options={[
            { value: "", label: t.admin.allStatuses },
            { value: "PENDING", label: "PENDING" },
            { value: "PAID", label: "PAID" },
            { value: "FAILED", label: "FAILED" },
            { value: "CANCELLED", label: "CANCELLED" },
          ]}
        />
      </div>
      {error ? <Card className="p-4 text-sm text-danger">{error}</Card> : null}
      {loading ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted">{t.admin.empty}</Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/payments/${item.id}`}>
                <Card className="p-4 text-xs transition hover:bg-surface-muted">
                  <p className="font-bold">
                    {item.status} · {formatIrr(item.amount)}
                  </p>
                  <p className="text-muted">
                    {item.user.username} · {item.refId ?? "—"} ·{" "}
                    {formatDisplayDateTime(item.createdAt, language)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > 20 ? (
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t.admin.prev}
          </Button>
          <Button
            variant="ghost"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            {t.admin.next}
          </Button>
        </div>
      ) : null}
    </AdminShell>
  );
}
