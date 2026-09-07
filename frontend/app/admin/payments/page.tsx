"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { ButtonLink } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
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
import { Pagination } from "@/shared/ui/Pagination";
import type { AdminPayment } from "@/features/admin/lib/admin";

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "danger";
  return "muted";
}

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

  const { paid, pending, failed } = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let failed = 0;
    for (const item of items) {
      if (item.status === "PAID") paid += 1;
      else if (item.status === "PENDING") pending += 1;
      else if (item.status === "FAILED") failed += 1;
    }
    return { paid, pending, failed };
  }, [items]);

  return (
    <AdminShell title={t.admin.paymentsTitle} subtitle={t.admin.subtitle}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Payments" value={String(total)} icon={CreditCard} />
        <StatCard
          label="Successful"
          value={String(paid)}
          icon={CheckCircle2}
          iconClassName="bg-success-soft text-success"
        />
        <StatCard
          label="Pending"
          value={String(pending)}
          icon={Clock}
          iconClassName="bg-accent-amber-soft text-accent-amber"
        />
        <StatCard
          label="Failed"
          value={String(failed)}
          icon={XCircle}
          iconClassName="bg-danger-soft text-danger"
        />
      </div>

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
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Gateway</TableHeaderCell>
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
                <TableCell className="font-bold">
                  {formatIrr(item.amount)}
                </TableCell>
                <TableCell className="text-xs text-muted">
                  ZarinPal{item.refId ? ` · ${item.refId}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(item.status)}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {formatDisplayDateTime(item.createdAt, language)}
                </TableCell>
                <TableCell>
                  <ButtonLink
                    href={`/admin/payments/${item.id}`}
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

      <Pagination
        className="mt-4"
        page={page}
        totalPages={Math.ceil(total / 20)}
        onPageChange={setPage}
        previousLabel={t.admin.prev}
        nextLabel={t.admin.next}
      />
    </AdminShell>
  );
}
