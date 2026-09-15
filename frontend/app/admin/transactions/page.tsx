"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  ListChecks,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { DatePicker } from "@/shared/ui/DatePicker";
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
import { transactionTypeLabel } from "@/features/wallet/lib/transactionDisplay";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { Pagination } from "@/shared/ui/Pagination";
import type { AdminTransaction } from "@/features/admin/lib/admin";

const INCOME_TYPES = new Set([
  "DEPOSIT",
  "TRANSFER_IN",
  "GOAL_RELEASE",
  "ENVELOPE_RELEASE",
]);

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

  const { deposits, withdrawals, transfers } = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let transfers = 0;
    for (const item of items) {
      if (item.type === "DEPOSIT") deposits += 1;
      else if (item.type === "WITHDRAWAL") withdrawals += 1;
      else if (item.type.startsWith("TRANSFER")) transfers += 1;
    }
    return { deposits, withdrawals, transfers };
  }, [items]);

  return (
    <AdminShell title={t.admin.transactionsTitle} subtitle={t.admin.subtitle}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={String(total)} icon={ListChecks} />
        <StatCard
          label="Deposits"
          value={String(deposits)}
          icon={ArrowDownLeft}
          iconClassName="bg-success-soft text-success"
        />
        <StatCard
          label="Withdrawals"
          value={String(withdrawals)}
          icon={ArrowUpRight}
          iconClassName="bg-accent-amber-soft text-accent-amber"
        />
        <StatCard
          label="Transfers"
          value={String(transfers)}
          icon={XCircle}
          iconClassName="bg-accent-purple-soft text-accent-purple"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              { value: "DEPOSIT", label: transactionTypeLabel("DEPOSIT", t) },
              {
                value: "WITHDRAWAL",
                label: transactionTypeLabel("WITHDRAWAL", t),
              },
              {
                value: "TRANSFER_OUT",
                label: transactionTypeLabel("TRANSFER_OUT", t),
              },
              {
                value: "TRANSFER_IN",
                label: transactionTypeLabel("TRANSFER_IN", t),
              },
              {
                value: "GOAL_CONTRIBUTE",
                label: transactionTypeLabel("GOAL_CONTRIBUTE", t),
              },
              {
                value: "GOAL_RELEASE",
                label: transactionTypeLabel("GOAL_RELEASE", t),
              },
              {
                value: "ENVELOPE_ALLOCATE",
                label: transactionTypeLabel("ENVELOPE_ALLOCATE", t),
              },
              {
                value: "ENVELOPE_RELEASE",
                label: transactionTypeLabel("ENVELOPE_RELEASE", t),
              },
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
        <Button variant="outline" size="sm" className="w-auto shrink-0">
          <Download className="me-1.5 h-3.5 w-3.5" />
          Export
        </Button>
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
            <TableHeaderCell>{t.admin.type}</TableHeaderCell>
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Created At</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const isIncome = INCOME_TYPES.has(item.type);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted">
                    #{item.id.slice(0, 6)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isIncome ? "success" : "info"}>
                      {transactionTypeLabel(item.type, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {item.user.username}
                  </TableCell>
                  <TableCell
                    className={
                      isIncome
                        ? "font-bold text-success"
                        : "font-bold text-foreground"
                    }
                  >
                    {isIncome ? "+" : "-"}
                    {formatIrr(item.amount)}
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
              );
            })}
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
