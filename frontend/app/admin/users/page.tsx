"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, UserCheck, Users } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { UserStatusActions } from "@/features/admin/components/UserStatusActions";
import { Badge } from "@/shared/ui/Badge";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
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
import { StatCard } from "@/shared/ui/StatCard";
import { Pagination } from "@/shared/ui/Pagination";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import type { AdminUserSummary } from "@/features/admin/lib/admin";

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api
      .getAdminUsers({ q, status, page })
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
  }, [q, status, page, t.messages, reloadKey]);

  const activeCount = items.filter((u) => u.status === "ACTIVE").length;
  const blockedCount = items.filter(
    (u) => u.status === "DISABLED" || u.status === "LOCKED",
  ).length;

  return (
    <AdminShell title={t.admin.usersTitle}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label={t.admin.totalUsers}
          value={String(total)}
          icon={Users}
        />
        <StatCard
          label={t.admin.activeUsers}
          value={String(activeCount)}
          icon={UserCheck}
        />
        <StatCard
          label={t.admin.statuses.DISABLED}
          value={String(blockedCount)}
          icon={ShieldAlert}
          iconClassName="bg-danger-soft text-danger"
        />
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
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
              { value: "ACTIVE", label: t.admin.statuses.ACTIVE },
              { value: "DISABLED", label: t.admin.statuses.DISABLED },
              { value: "LOCKED", label: t.admin.statuses.LOCKED },
            ]}
          />
        </div>

        {error ? (
          <div className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {loading ? <PageSpinner label={t.common.loading} /> : null}

        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted">
            {t.admin.empty}
          </div>
        ) : !loading ? (
          <Table className="border-0">
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Balance</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableHead>
            <TableBody>
              {items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs text-muted">
                    #{user.id.slice(0, 6)}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {user.username}
                  </TableCell>
                  <TableCell className="text-muted">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <Badge className="bg-foreground text-surface">
                        ADMIN
                      </Badge>
                    ) : (
                      <Badge variant="muted">{user.role ?? "USER"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "ACTIVE"
                          ? "success"
                          : user.status === "LOCKED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {t.admin.statuses[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {user.wallet ? formatIrr(user.wallet.balance) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-2">
                      <ButtonLink
                        href={`/admin/users/${user.id}`}
                        size="sm"
                        variant="secondary"
                        className="w-auto"
                      >
                        View
                      </ButtonLink>
                      <UserStatusActions
                        userId={user.id}
                        status={user.status}
                        compact
                        onUpdated={() => setReloadKey((key) => key + 1)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        <Pagination
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
          previousLabel={t.admin.prev}
          nextLabel={t.admin.next}
        />
      </Card>
    </AdminShell>
  );
}
