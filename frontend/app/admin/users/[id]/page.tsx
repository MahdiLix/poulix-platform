"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Shield, UserRound, Wallet } from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { UserStatusActions } from "@/features/admin/components/UserStatusActions";
import { Badge } from "@/shared/ui/Badge";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ButtonLink } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
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
import type { AdminUserDetail } from "@/features/admin/lib/admin";

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "ACTIVE" || status === "PAID") return "success";
  if (status === "LOCKED" || status === "FAILED") return "danger";
  if (status === "DISABLED" || status === "PENDING") return "warning";
  return "muted";
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setUser(await api.getAdminUser(id));
      setError(null);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadAdmin"));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminUser(id)
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(localizeError(err, t.messages, "failedToLoadAdmin"));
      });
    return () => {
      cancelled = true;
    };
  }, [id, t.messages]);

  return (
    <AdminShell title={t.admin.userDetailTitle}>
      {error ? (
        <Card className="mb-4 p-4 text-sm text-danger">{error}</Card>
      ) : null}
      {!user ? (
        <PageSpinner label={t.common.loading} />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{user.username}</p>
                  <p className="text-sm text-muted">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={user.role === "ADMIN" ? "default" : "muted"}>
                      {user.role}
                    </Badge>
                    <Badge variant={statusVariant(user.status)}>
                      {t.admin.statuses[user.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              <UserStatusActions
                userId={user.id}
                status={user.status}
                onUpdated={() => void load()}
              />
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <InfoCard
              icon={UserRound}
              label={t.admin.role}
              value={user.role}
            />
            <InfoCard
              icon={Wallet}
              label={t.common.currentBalance}
              value={
                user.wallet
                  ? formatIrr(user.wallet.balance, user.wallet.currency)
                  : "—"
              }
            />
            <InfoCard
              icon={CreditCard}
              label={t.profile.memberSince}
              value={formatDisplayDateTime(user.createdAt, language)}
            />
          </div>

          <Card className="grid gap-3 p-5 sm:grid-cols-2">
            <DetailRow label="User ID" value={user.id} mono />
            <DetailRow
              label="Wallet ID"
              value={user.wallet?.id ?? "—"}
              mono
            />
            <DetailRow
              label={t.admin.status}
              value={t.admin.statuses[user.status]}
            />
            <DetailRow
              label="Status changed"
              value={
                user.statusChangedAt
                  ? formatDisplayDateTime(user.statusChangedAt, language)
                  : "—"
              }
            />
            <DetailRow
              label="Status reason"
              value={user.statusReason ?? "—"}
            />
            <DetailRow
              label="Wallet created"
              value={
                user.wallet
                  ? formatDisplayDateTime(user.wallet.createdAt, language)
                  : "—"
              }
            />
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">{t.admin.nav.transactions}</h2>
            {user.recentTransactions.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              <Table className="border-0">
                <TableHead>
                  <TableHeaderCell>{t.admin.type}</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell> </TableHeaderCell>
                </TableHead>
                <TableBody>
                  {user.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-semibold">
                        {transactionTypeLabel(tx.type, t)}
                      </TableCell>
                      <TableCell>{formatIrr(tx.amount)}</TableCell>
                      <TableCell className="text-xs text-muted">
                        {formatDisplayDateTime(tx.createdAt, language)}
                      </TableCell>
                      <TableCell>
                        <ButtonLink
                          href={`/admin/transactions/${tx.id}`}
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
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">{t.admin.nav.payments}</h2>
            {user.recentPayments.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              <Table className="border-0">
                <TableHead>
                  <TableHeaderCell>{t.admin.status}</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Ref</TableHeaderCell>
                  <TableHeaderCell> </TableHeaderCell>
                </TableHead>
                <TableBody>
                  {user.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Badge variant={statusVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatIrr(payment.amount)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted">
                        {payment.refId ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ButtonLink
                          href={`/admin/payments/${payment.id}`}
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
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-bold">{t.security.eventsTitle}</h2>
              {user.securityEvents.length === 0 ? (
                <p className="text-xs text-muted">{t.admin.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {user.securityEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold">{event.type}</p>
                      </div>
                      <p className="text-[11px] text-muted">
                        {formatDisplayDateTime(event.createdAt, language)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-bold">{t.security.sessionsTitle}</h2>
              {user.sessions.length === 0 ? (
                <p className="text-xs text-muted">{t.admin.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {user.sessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold">
                        {session.deviceLabel ?? t.security.unknownDevice}
                      </p>
                      <p className="text-[11px] text-muted">
                        {formatDisplayDateTime(session.lastSeenAt, language)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </Card>
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
