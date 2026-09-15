"use client";

import { useEffect, useState } from "react";
import { Download, ScrollText } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Button } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { SearchInput } from "@/shared/ui/SearchInput";
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
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { Pagination } from "@/shared/ui/Pagination";
import type { AdminAuditLog } from "@/features/admin/lib/admin";

export default function AdminAuditPage() {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminAuditLogs({ page })
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
  }, [page, t.messages]);

  return (
    <AdminShell title={t.admin.auditTitle} subtitle={t.admin.subtitle}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Events"
          value={String(total)}
          icon={ScrollText}
        />
        <StatCard
          label="Successful"
          value={String(items.filter((i) => i.success).length)}
          iconClassName="bg-success-soft text-success"
        />
        <StatCard
          label="Failed"
          value={String(items.filter((i) => !i.success).length)}
          iconClassName="bg-danger-soft text-danger"
        />
        <StatCard label="Page" value={String(page)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            placeholder={t.admin.search}
            readOnly
            className="cursor-default"
          />
        </div>
        <Button variant="outline" size="sm" className="w-auto">
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
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Action</TableHeaderCell>
            <TableHeaderCell>Resource</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Created At</TableHeaderCell>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-muted">
                  #{item.id.slice(0, 6)}
                </TableCell>
                <TableCell className="font-semibold">
                  {item.adminUser.username}
                </TableCell>
                <TableCell>
                  <Badge variant="info">{item.action}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {item.targetType}
                  {item.targetId ? ` #${item.targetId.slice(0, 6)}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={item.success ? "success" : "danger"}>
                    {item.success ? "Success" : "Failed"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {formatDisplayDateTime(item.createdAt, language)}
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
