"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Activity,
  CreditCard,
  Landmark,
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
import { DashboardMetricCard } from "@/shared/ui/DashboardMetricCard";
import { GroupedBarChart } from "@/shared/ui/GroupedBarChart";
import { AreaChart } from "@/shared/ui/AreaChart";
import { DonutChart } from "@/shared/ui/DonutChart";
import { PageSpinner } from "@/shared/ui/Spinner";
import { ButtonLink } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime, formatMonthDay } from "@/shared/i18n/dates";
import { WalletIllustration } from "@/shared/ui/WalletIllustration";
import {
  transactionReasonLabel,
  transactionTypeLabel,
} from "@/features/wallet/lib/transactionDisplay";
import type {
  AdminDashboard,
  AdminUserSummary,
} from "@/features/admin/lib/admin";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  const activityChart = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: localDateKey(date),
        label: formatMonthDay(date, language),
        deposits: 0,
        withdrawals: 0,
        transfers: 0,
      };
    });
    const rowByDay = new Map(rows.map((row) => [row.key, row]));
    for (const transaction of data?.recentActivity ?? []) {
      const createdAt = new Date(transaction.createdAt);
      if (Number.isNaN(createdAt.getTime())) continue;
      const row = rowByDay.get(localDateKey(createdAt));
      if (!row) continue;
      if (transaction.type === "DEPOSIT") row.deposits += 1;
      else if (transaction.type === "WITHDRAWAL") row.withdrawals += 1;
      else if (
        transaction.type === "TRANSFER_IN" ||
        transaction.type === "TRANSFER_OUT"
      ) {
        row.transfers += 1;
      }
    }
    return rows;
  }, [data?.recentActivity, language]);

  return (
    <AdminShell
      title={t.admin.dashboardTitle}
      subtitle={t.admin.subtitle}
      showHeading={false}
    >
      {error ? (
        <Card className="p-6 text-sm text-danger">{error}</Card>
      ) : !data ? (
        <PageSpinner label={t.common.loading} />
      ) : (
        <div className="space-y-4 lg:space-y-5">
          {/* Hero section */}
          <section className="fintech-hero relative isolate overflow-hidden rounded-[14px] p-5 text-white lg:p-6">
            <div className="fintech-grid-pattern pointer-events-none absolute inset-0 z-0 opacity-60" />
            <div className="relative z-10 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,32%)] md:grid-cols-[minmax(0,1fr)_minmax(11rem,26%)_auto]">
              <div className="min-w-0 md:max-w-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="text-lg font-black tracking-tight sm:text-2xl">
                      {t.admin.dashboardTitle}
                    </h1>
                    <p className="mt-0.5 text-xs text-blue-100/70">
                      {t.admin.subtitle}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      icon: Users,
                      value: data.users.total,
                      label: t.admin.totalUsers,
                    },
                    {
                      icon: Activity,
                      value: transactionCount,
                      label: t.admin.nav.transactions,
                    },
                    {
                      icon: CreditCard,
                      value: paymentCount,
                      label: t.admin.nav.payments,
                    },
                    {
                      icon: Landmark,
                      value: data.wallets.total,
                      label: t.admin.totalWallets,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 backdrop-blur-sm"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-secondary" />
                        <div className="min-w-0">
                          <p className="amount text-xs font-bold">
                            {item.value}
                          </p>
                          <p className="truncate text-[9px] text-blue-100/65">
                            {item.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <WalletIllustration
                priority
                className="relative h-24 w-full sm:h-32 md:h-36"
              />
              <div className="rounded-xl border border-white/10 bg-[#03142f]/60 px-4 py-3 backdrop-blur-sm sm:col-span-2 md:col-span-1 md:w-44">
                <p className="text-xs font-bold">{t.admin.status}</p>
                <p className="mt-2 flex items-center gap-2 text-[10px] text-blue-100/75">
                  <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_12px_var(--secondary)]" />
                  {t.admin.statuses.ACTIVE}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DashboardMetricCard
              label={t.admin.totalUsers}
              value={String(data.users.total)}
              icon={Users}
              tone="blue"
              caption={t.admin.activeUsers}
            />
            <DashboardMetricCard
              label={t.admin.nav.transactions}
              value={String(transactionCount)}
              icon={TrendingUp}
              tone="emerald"
              caption={t.admin.recentActivity}
              spark={activityChart.map(
                (row) => row.deposits + row.withdrawals + row.transfers,
              )}
            />
            <DashboardMetricCard
              label={t.admin.nav.payments}
              value={String(paymentCount)}
              icon={CreditCard}
              tone="violet"
              caption={t.admin.pendingPayments}
            />
            <DashboardMetricCard
              label={t.admin.totalWithdrawals}
              value={formatIrr(
                data.transactions.withdrawalAmount,
                "IRR",
                language,
              )}
              icon={Wallet}
              tone="amber"
              caption={t.admin.nav.withdrawals}
              spark={activityChart.map((row) => row.withdrawals)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="space-y-4 p-4 lg:col-span-8 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {t.admin.recentActivity}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {t.admin.nav.transactions}
                  </p>
                </div>
                <span className="rounded-lg bg-primary px-3 py-1 text-[10px] font-bold text-white shadow-md shadow-primary/20">
                  {t.statistics.days7}
                </span>
              </div>
              <GroupedBarChart
                data={activityChart}
                series={[
                  {
                    key: "deposits",
                    label: t.admin.totalDeposits,
                    color: "var(--primary)",
                  },
                  {
                    key: "withdrawals",
                    label: t.admin.totalWithdrawals,
                    color: "var(--secondary)",
                  },
                  {
                    key: "transfers",
                    label: t.admin.totalTransfers,
                    color: "var(--accent-purple)",
                  },
                ]}
                height={250}
              />
            </Card>

            <Card className="space-y-4 p-4 lg:col-span-4 lg:p-5">
              <h2 className="text-sm font-bold text-foreground">
                {t.admin.status}
              </h2>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-col xl:flex-row">
                <DonutChart
                  size={150}
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
                <div className="w-full space-y-3 text-[10px]">
                  {[
                    {
                      label: t.admin.statuses.ACTIVE,
                      value: data.users.active,
                      color: "bg-secondary",
                    },
                    {
                      label: t.admin.statuses.DISABLED,
                      value: data.users.disabled,
                      color: "bg-warning",
                    },
                    {
                      label: t.admin.statuses.LOCKED,
                      value: data.users.locked,
                      color: "bg-danger",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-muted">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${item.color}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="font-bold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                  {
                    label: t.admin.totalDeposits,
                    value: data.transactions.deposits,
                  },
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
                <ButtonLink
                  href="/admin/users"
                  size="sm"
                  variant="secondary"
                  className="w-auto"
                >
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
                          <Badge
                            variant={
                              item.status === "ACTIVE"
                                ? "success"
                                : item.status === "LOCKED"
                                  ? "danger"
                                  : "warning"
                            }
                          >
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
                            <p className="text-xs font-semibold">
                              {transactionTypeLabel(item.type, t)}
                            </p>
                            <p className="text-[10px] text-muted">
                              <bdi>{item.user.username}</bdi>
                              {item.reason
                                ? ` · ${transactionReasonLabel(item.reason, t)}`
                                : ""}
                            </p>
                            <p className="mt-0.5 text-[9px] text-muted/80">
                              {formatDisplayDateTime(item.createdAt, language)}
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
