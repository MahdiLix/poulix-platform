"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { TextField } from "@/shared/ui/TextField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui/Table";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminTransaction } from "@/features/admin/lib/admin";

export default function AdminWithdrawalsPage() {
  const { t, language } = useLanguage();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminWithdrawals({ q, page })
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
  }, [q, page, t.messages]);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AdminShell title={t.admin.withdrawalsTitle} subtitle={t.admin.subtitle}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Withdrawals" value={String(total)} icon={Wallet} />
        <StatCard
          label="Successful"
          value={String(items.length)}
          icon={CheckCircle2}
          iconClassName="bg-success-soft text-success"
        />
        <StatCard label="Total Amount" value={formatIrr(totalAmount)} />
        <StatCard label="Page" value={`${page}`} />
      </div>

      <div className="mb-4">
        <TextField
          label={t.admin.search}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {error ? (
        <div className="mb-4 rounded-xl bg-danger-soft p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {loading ? (
        <PageSpinner label={t.common.loading} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted">
          {t.admin.empty}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>ID</TableHeaderCell>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Method</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>{t.admin.status}</TableHeaderCell>
            <TableHeaderCell>Created At</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-muted">
                  #{item.id.slice(0, 6)}
                </TableCell>
                <TableCell className="font-semibold">
                  {item.user.username}
                </TableCell>
                <TableCell className="text-xs text-muted">
                  Bank Transfer
                </TableCell>
                <TableCell className="font-bold">
                  {formatIrr(item.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="success">Success</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {formatDisplayDateTime(item.createdAt, language)}
                </TableCell>
                <TableCell>
                  <ButtonLink
                    href={`/admin/transactions/${item.id}`}
                    size="sm"
                    variant="outline"
                    className="w-auto"
                  >
                    View
                  </ButtonLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > 20 ? (
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-auto"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t.admin.prev}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-auto"
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
