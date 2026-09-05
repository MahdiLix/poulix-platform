"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { OfferEditor } from "@/features/admin/components/OfferEditor";
import { UserStatusActions } from "@/features/admin/components/UserStatusActions";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { AreaChart } from "@/shared/ui/AreaChart";
import { BarChart } from "@/shared/ui/BarChart";
import { DonutChart } from "@/shared/ui/DonutChart";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ButtonLink } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import type {
  AdminDashboard,
  AdminUserSummary,
} from "@/features/admin/lib/admin";

export default function AdminDashboardPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void api
      .getAdminDashboard()
      .then(setData)
      .catch((err) =>
        setError(localizeError(err, t.messages, "failedToLoadAdmin")),
      );
    void api
      .getAdminUsers({ page: 1 })
      .then((result) => setUsers(result.items.slice(0, 6)))
      .catch(() => {});
  }, [t.messages, reloadKey]);

  const transactionCount = data
    ? data.transactions.deposits +
      data.transactions.withdrawals +
      data.transactions.transfers
    : 0;
  const paymentCount = data
    ? data.operations.paidPayments +
      data.operations.pendingPayments +
      data.operations.failedPayments
    : 0;

  return (
    <AdminShell title={t.admin.dashboardTitle} subtitle={t.admin.subtitle}>
      {error ? (
        <Card className="p-6 text-sm text-danger">{error}</Card>
      ) : !data ? (
        <PageSpinner label={t.common.loading} />
      ) : (
        <div className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            <StatCard
              label={t.admin.totalUsers}
              value={String(data.users.total)}
              icon={Users}
              iconClassName="bg-primary-soft text-primary"
            />
            <StatCard
              label={t.admin.nav.transactions}
              value={String(transactionCount)}
              icon={TrendingUp}
              iconClassName="bg-secondary-soft text-secondary"
            />
            <StatCard
              label={t.admin.nav.payments}
              value={String(paymentCount)}
              icon={CreditCard}
              iconClassName="bg-accent-amber-soft text-accent-amber"
            />
            <StatCard
              label={t.admin.totalWithdrawals}
              value={formatIrr(data.transactions.withdrawalAmount, "IRR", language)}
              icon={Wallet}
              iconClassName="bg-accent-teal-soft text-accent-teal"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <Card className="space-y-4 p-5 lg:col-span-7 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground">
                  {t.admin.nav.transactions}
                </h2>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-muted">
                  {t.admin.type}
                </span>
              </div>
              <BarChart
                data={[
                  {
                    label: t.admin.totalDeposits,
                    value: data.transactions.depositAmount,
                    color: "var(--chart-income)",
                  },
                  {
                    label: t.admin.totalWithdrawals,
                    value: data.transactions.withdrawalAmount,
                    color: "var(--warning)",
                  },
                  {
                    label: t.admin.totalTransfers,
                    value: data.transactions.transferAmount,
                    color: "var(--chart-secondary, var(--secondary))",
                  },
                  {
                    label: t.admin.nav.payments,
                    value: data.operations.paidPayments,
                    color: "var(--accent-teal)",
                  },
                ]}
                height={260}
                formatValue={(value) => formatIrr(value, "", language).trim()}
              />
            </Card>

            <Card className="space-y-4 p-5 lg:col-span-5 lg:p-6">
              <h2 className="text-sm font-bold text-foreground">
                {t.admin.status}
              </h2>
              <DonutChart
                segments={[
                  {
                    label: t.admin.statuses.ACTIVE,
                    value: data.users.active,
                    color: "var(--secondary)",
                  },
                  {
                    label: t.admin.statuses.DISABLED,
                    value: data.users.disabled,
                    color: "var(--warning)",
                  },
                  {
                    label: t.admin.statuses.LOCKED,
                    value: data.users.locked,
                    color: "var(--danger)",
                  },
                ]}
                centerValue={String(data.users.total)}
                centerLabel={t.admin.totalUsers}
              />
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            <Card className="p-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                {t.admin.activeUsers}
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {data.users.active}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                {t.admin.totalWallets}
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {data.wallets.total}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                {t.admin.pendingPayments}
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {data.operations.pendingPayments}
              </p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-danger uppercase">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t.admin.suspiciousEvents}
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums text-danger">
                {data.operations.suspiciousEvents}
              </p>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <Card className="space-y-4 p-5 lg:col-span-5 lg:p-6">
              <h2 className="text-sm font-bold text-foreground">
                {t.admin.nav.payments}
              </h2>
              <DonutChart
                segments={[
                  {
                    label: t.admin.statuses.ACTIVE,
                    value: data.operations.paidPayments,
                    color: "var(--chart-income)",
                  },
                  {
                    label: t.admin.pendingPayments,
                    value: data.operations.pendingPayments,
                    color: "var(--warning)",
                  },
                  {
                    label: t.admin.failedPayments,
                    value: data.operations.failedPayments,
                    color: "var(--danger)",
                  },
                ]}
                centerValue={String(paymentCount)}
                centerLabel={t.admin.nav.payments}
              />
            </Card>

            <Card className="space-y-4 p-5 lg:col-span-7 lg:p-6">
              <h2 className="text-sm font-bold text-foreground">
                {t.admin.totalDeposits} / {t.admin.nav.withdrawals}
              </h2>
              <AreaChart
                data={[
                  { label: t.admin.totalDeposits, value: data.transactions.deposits },
                  {
                    label: t.admin.totalWithdrawals,
                    value: data.transactions.withdrawals,
                  },
                  {
                    label: t.admin.totalTransfers,
                    value: data.transactions.transfers,
                  },
                ]}
                height={240}
              />
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <Card className="space-y-4 p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">{t.admin.usersOnPlatform}</h2>
                <ButtonLink href="/admin/users" size="sm" variant="secondary" className="w-auto">
                  {t.admin.nav.users}
                </ButtonLink>
              </div>
              {users.length === 0 ? (
                <p className="text-xs text-muted">{t.admin.empty}</p>
              ) : (
                <ul className="space-y-3">
                  {users.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          <bdi>{item.username}</bdi>
                        </p>
                        <p className="truncate text-xs text-muted">
                          <bdi>{item.email}</bdi>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={item.status === "ACTIVE" ? "success" : item.status === "LOCKED" ? "danger" : "warning"}>
                            {t.admin.statuses[item.status]}
                          </Badge>
                          {item.wallet ? (
                            <span className="text-xs font-semibold">
                              {formatIrr(item.wallet.balance, "IRR", language)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                        <ButtonLink
                          href={`/admin/users/${item.id}`}
                          size="sm"
                          variant="secondary"
                          className="w-auto"
                        >
                          View
                        </ButtonLink>
                        <UserStatusActions
                          userId={item.id}
                          status={item.status}
                          compact
                          onUpdated={() => setReloadKey((key) => key + 1)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 lg:p-6">
              <OfferEditor />
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <Card className="space-y-3 p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">{t.admin.recentActivity}</h2>
                <Link
                  href="/admin/transactions"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t.admin.nav.transactions}
                </Link>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-muted">{t.admin.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentActivity.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/transactions/${item.id}`}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary-soft/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold">{item.type}</p>
                            <p className="text-[10px] text-muted">
                              <bdi>{item.user.username}</bdi>
                              {item.reason ? ` · ${item.reason}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold">
                          {formatIrr(item.amount, "IRR", language)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">{t.admin.recentSecurity}</h2>
                <Link
                  href="/admin/security"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t.admin.nav.security}
                </Link>
              </div>
              {data.recentSecurityEvents.length === 0 ? (
                <p className="text-xs text-muted">{t.admin.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentSecurityEvents.map((item) => (
                    <li key={item.id}>
                      <Link
                        href="/admin/security"
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary-soft/40"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft text-danger">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.type}</p>
                          <p className="text-[10px] text-muted">
                            <bdi>{item.user.username}</bdi>
                          </p>
                        </div>
                      </Link>
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
