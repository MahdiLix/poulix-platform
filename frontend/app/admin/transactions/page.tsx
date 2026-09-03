"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { DatePicker } from "@/shared/ui/DatePicker";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminTransaction } from "@/features/admin/lib/admin";

export default function AdminTransactionsPage() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminTransactions({
        q,
        type,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
        page,
      })
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
  }, [q, type, from, to, page, t.messages]);

  return (
    <AdminShell title={t.admin.transactionsTitle}>
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
          label={t.admin.type}
          value={type}
          onChange={(val) => {
            setPage(1);
            setType(val);
          }}
          options={[
            { value: "", label: t.admin.allTypes },
            { value: "DEPOSIT", label: "DEPOSIT" },
            { value: "WITHDRAWAL", label: "WITHDRAWAL" },
            { value: "TRANSFER_OUT", label: "TRANSFER_OUT" },
            { value: "TRANSFER_IN", label: "TRANSFER_IN" },
            { value: "GOAL_CONTRIBUTE", label: "GOAL_CONTRIBUTE" },
            { value: "GOAL_RELEASE", label: "GOAL_RELEASE" },
            { value: "ENVELOPE_ALLOCATE", label: "ENVELOPE_ALLOCATE" },
            { value: "ENVELOPE_RELEASE", label: "ENVELOPE_RELEASE" },
          ]}
        />
        <DatePicker
          label={t.admin.fromDate}
          value={from}
          onChange={(val) => {
            setPage(1);
            setFrom(val);
          }}
        />
        <DatePicker
          label={t.admin.toDate}
          value={to}
          onChange={(val) => {
            setPage(1);
            setTo(val);
          }}
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
              <Link href={`/admin/transactions/${item.id}`}>
                <Card className="p-4 text-xs transition hover:bg-surface-muted">
                  <p className="font-bold">
                    {item.type} · {formatIrr(item.amount)}
                  </p>
                  <p className="text-muted">
                    {item.user.username} ·{" "}
                    {formatDisplayDateTime(item.createdAt, language)}
                  </p>
                  {item.reason ? <p>{item.reason}</p> : null}
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
