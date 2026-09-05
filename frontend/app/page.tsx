"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Gift,
  Plus,
  Send,
  Shield,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { AreaChart } from "@/shared/ui/AreaChart";
import { DonutChart } from "@/shared/ui/DonutChart";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { Sparkline } from "@/shared/ui/Sparkline";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useUser } from "@/shared/user/UserProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { cn } from "@/shared/cn";
import { DepositModal } from "@/features/deposit/components/DepositModal";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  goalProgressPercent,
  parseGoalAmount,
  type Goal,
} from "@/features/goals/lib/goals";
import { parseEnvelopeAmount } from "@/features/envelopes/lib/envelopes";
import {
  activateHomepageOffer,
  getHomepageOffer,
  type HomepageOffer,
} from "@/features/offers/lib/offers";

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  createdAt: string;
};

const INCOME_TYPES = new Set([
  "DEPOSIT",
  "TRANSFER_IN",
  "GOAL_RELEASE",
  "ENVELOPE_RELEASE",
]);

const EXPENSE_TYPES = new Set([
  "WITHDRAWAL",
  "TRANSFER_OUT",
  "GOAL_CONTRIBUTE",
  "ENVELOPE_ALLOCATE",
]);

export default function HomePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const { user } = useUser();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allocated, setAllocated] = useState(0);
  const [chartRange, setChartRange] = useState("30");
  const [offer, setOffer] = useState<HomepageOffer | null>(null);

  const loadDashboardData = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const [txRes, goalsRes, envelopesRes] = await Promise.all([
        api.getTransactions(),
        api.getGoals(),
        api.getEnvelopes(),
      ]);
      if (Array.isArray(txRes)) setTransactions(txRes);
      if (goalsRes?.goals) setGoals(goalsRes.goals);
      if (envelopesRes?.summary) {
        setAllocated(
          parseEnvelopeAmount(envelopesRes.summary.totalAllocatedInEnvelopes),
        );
      }
    } catch {
      // non-critical dashboard data
    }
  };

  useEffect(() => {
    void loadDashboardData();
    setOffer(getHomepageOffer());
  }, []);

  const stats = useMemo(() => {
    let totalSent = 0;
    let totalReceived = 0;
    for (const tx of transactions) {
      const amount = parseAmount(tx.amount);
      if (tx.type && EXPENSE_TYPES.has(tx.type)) totalSent += amount;
      if (tx.type && INCOME_TYPES.has(tx.type)) totalReceived += amount;
    }
    return {
      totalTransactions: transactions.length,
      totalSent,
      totalReceived,
      net: totalReceived - totalSent,
    };
  }, [transactions]);

  const chartSeries = useMemo(() => {
    const days = chartRange === "7" ? 7 : chartRange === "90" ? 90 : 30;
    const now = new Date();
    const step = Math.max(1, Math.floor(days / 7));

    const income: { label: string; value: number }[] = [];
    const expense: { label: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      let incomeTotal = 0;
      let expenseTotal = 0;
      for (const tx of transactions) {
        if (!tx.createdAt?.startsWith(key)) continue;
        const amount = parseAmount(tx.amount);
        if (INCOME_TYPES.has(tx.type)) incomeTotal += amount;
        if (EXPENSE_TYPES.has(tx.type)) expenseTotal += amount;
      }
      income.push({ label, value: incomeTotal });
      expense.push({ label, value: expenseTotal });
    }

    if (income.length === 0) {
      return [
        { label: t.home.income, color: "var(--chart-income)", data: [{ label: "—", value: balance ?? 0 }] },
        { label: t.home.expense, color: "var(--chart-expense)", data: [{ label: "—", value: 0 }] },
        { label: t.home.lastMonthBalance, color: "var(--warning)", dashed: true, data: [{ label: "—", value: 0 }] },
      ];
    }

    return [
      { label: t.home.income, color: "var(--chart-income)", data: income },
      { label: t.home.expense, color: "var(--chart-expense)", data: expense },
      {
        label: t.home.lastMonthBalance,
        color: "var(--warning)",
        dashed: true,
        data: income.map((point, i) => ({
          label: point.label,
          value: Math.round(point.value * 0.65 + (expense[i]?.value ?? 0) * 0.2),
        })),
      },
    ];
  }, [transactions, chartRange, balance, t.home.income, t.home.expense, t.home.lastMonthBalance]);

  const recentActivity = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [transactions]);

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const savedInGoals = goals.reduce(
    (sum, goal) => sum + parseGoalAmount(goal.savedAmount),
    0,
  );
  const spendable = Math.max(0, (balance ?? 0) - allocated);

  const openTopUp = (fromOffer = false) => {
    if (!getStoredToken()) router.push("/login");
    else {
      if (fromOffer && offer) activateHomepageOffer(offer);
      setIsDepositOpen(true);
    }
  };

  const rightPanel = (
    <>
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {t.home.thisMonth}
        </h2>
        <DonutChart
          size={148}
          segments={[
            {
              label: t.home.income,
              value: Math.max(stats.totalReceived, 1),
              color: "var(--chart-income)",
            },
            {
              label: t.home.expense,
              value: Math.max(stats.totalSent, 1),
              color: "var(--chart-expense)",
            },
          ]}
          centerValue={`${stats.net >= 0 ? "+" : ""}${formatIrr(stats.net, currency).replace(" IRR", "")}`}
          centerLabel={t.home.netThisMonth}
        />
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-success" />
              {t.home.income}
            </span>
            <span className="tabular-nums text-muted">
              {formatIrr(stats.totalReceived, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-danger" />
              {t.home.expense}
            </span>
            <span className="tabular-nums text-muted">
              {formatIrr(stats.totalSent, currency)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {t.goals.title}
          </h2>
          <Link
            href="/goals"
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            {t.home.seeMore}
          </Link>
        </div>
        {activeGoals.length === 0 ? (
          <p className="text-xs text-muted">{t.goals.emptyTitle}</p>
        ) : (
          <ul className="space-y-3">
            {activeGoals.slice(0, 3).map((goal) => {
              const saved = parseGoalAmount(goal.savedAmount);
              const target = parseGoalAmount(goal.targetAmount);
              const progress = goalProgressPercent(saved, target);
              return (
                <li key={goal.id}>
                  <Link href={`/goals/${goal.id}`} className="block space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-foreground">
                        {goal.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar value={progress} barClassName="bg-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {offer?.enabled ? (
      <div className="relative overflow-hidden rounded-[14px] border border-warning/35 bg-promo-gradient p-5 text-foreground shadow-[var(--shadow-card)]">
        <Gift className="absolute -end-3 -bottom-3 h-24 w-24 text-warning/40" />
        <span className="inline-block rounded-full bg-warning/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-warning uppercase">
          {t.home.limitedTime}
        </span>
        <h3 className="relative mt-2 text-sm font-semibold leading-snug">
          {offer.title}
        </h3>
        <p className="relative mt-1 text-[11px] leading-relaxed text-foreground/75">
          {offer.description}
        </p>
        <Button
          size="sm"
          className="relative mt-3 w-auto"
          onClick={() => openTopUp(true)}
        >
          {t.home.topUpNow}
        </Button>
      </div>
      ) : null}

      {user?.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 text-xs font-semibold text-foreground transition hover:border-primary/30"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="flex-1">{t.admin.openAdmin}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted rtl:rotate-180" />
        </Link>
      ) : null}
    </>
  );

  return (
    <AppShell
      variant="dashboard"
      rightPanel={rightPanel}
      showTopBar
    >
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
            {t.home.welcomeToPoulix}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {stats.net > 0 ? (
              <>
                {t.home.walletInsight.split("{percent}")[0]}
                <span className="font-semibold text-secondary">
                  {((stats.net / Math.max(stats.totalReceived, 1)) * 100).toFixed(1)}%
                </span>
                {t.home.walletInsight.split("{percent}")[1]}
              </>
            ) : (
              t.home.walletInsightFlat
            )}
          </p>
        </div>

        <Card className="relative overflow-hidden border-0 bg-ink-hero p-5 text-primary-foreground lg:p-6">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-white/65 uppercase">
                    {t.common.availableBalance}
                  </p>
                  <button
                    type="button"
                    onClick={() => setHideBalance((v) => !v)}
                    className="cursor-pointer rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                    aria-label="Toggle balance visibility"
                  >
                    {hideBalance ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-warning">
                  <Clock className="h-3.5 w-3.5" />
                  {t.home.lastUpdated}
                </p>
              </div>
              {hideBalance ? (
                <p className="amount text-2xl font-bold tracking-tight lg:text-3xl">
                  ••••••
                </p>
              ) : (
                <WalletBalance
                  status={status}
                  balance={balance}
                  currency={currency}
                  error={error}
                  onRetry={() => void refresh()}
                  variant="hero"
                  label=""
                />
              )}
              <p className="text-[11px] text-white/60">
                {t.home.allocated} {formatIrr(allocated, currency)} ·{" "}
                {t.goals.savedInGoals} {formatIrr(savedInGoals, currency)} ·{" "}
                {t.home.spendable} {formatIrr(spendable, currency)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => openTopUp()}
              >
                <Plus className="me-1.5 h-3.5 w-3.5" />
                {t.home.topUp}
              </Button>
              <Link href="/send">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <Send className="me-1.5 h-3.5 w-3.5" />
                  {t.home.send}
                </Button>
              </Link>
              <Link href="/transfer">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  {t.withdrawal.withdrawTitle}
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiChip
            label={t.home.netThisMonth}
            value={formatIrr(stats.net, currency)}
            tone="success"
            spark={chartSeries[0]?.data.map((d) => d.value) ?? []}
          />
          <KpiChip
            label={t.home.spent}
            value={formatIrr(stats.totalSent, currency)}
            tone="danger"
            spark={chartSeries[1]?.data.map((d) => d.value) ?? []}
          />
          <KpiChip
            label={t.home.received}
            value={formatIrr(stats.totalReceived, currency)}
            tone="success"
            spark={chartSeries[0]?.data.map((d) => d.value) ?? []}
          />
          <KpiChip
            label={t.home.activeGoals}
            value={String(activeGoals.length)}
          />
        </div>

        <Card className="p-5 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground lg:text-base">
              {t.home.cashFlow}
            </h2>
            <div className="flex items-center gap-1 rounded-[10px] border border-border bg-surface-muted p-1">
              {[
                { key: "7", label: t.statistics.days7 },
                { key: "30", label: t.statistics.days30 },
                { key: "90", label: t.statistics.days90 },
              ].map((range) => (
                <button
                  key={range.key}
                  type="button"
                  onClick={() => setChartRange(range.key)}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition",
                    chartRange === range.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <AreaChart
            series={chartSeries}
            height={200}
            showLegend
            formatValue={(value) => formatIrr(value, currency)}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {t.home.recentActivity}
            </h2>
            <Link
              href="/history"
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              {t.home.viewAllHistory} →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              {t.home.noRecentActivity}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((tx) => {
                const isIncoming = INCOME_TYPES.has(tx.type);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                          isIncoming
                            ? "bg-success-soft text-success"
                            : "bg-danger-soft text-danger",
                        )}
                      >
                        {isIncoming ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {tx.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-muted">
                          {formatDisplayDateTime(tx.createdAt, language)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "amount shrink-0 text-xs font-bold",
                        isIncoming ? "text-success" : "text-danger",
                      )}
                    >
                      {isIncoming ? "+" : "-"}
                      {formatIrr(parseAmount(tx.amount), currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </AppShell>
  );
}

function KpiChip({
  label,
  value,
  tone,
  spark,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  spark?: number[];
}) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p
          className={cn(
            "amount text-sm font-bold lg:text-base",
            tone === "success" && "text-success",
            tone === "danger" && "text-danger",
            !tone && "text-foreground",
          )}
        >
          {value}
        </p>
        {spark && spark.length > 1 ? (
          <Sparkline
            data={spark}
            color={
              tone === "danger"
                ? "var(--danger)"
                : tone === "success"
                  ? "var(--success)"
                  : "var(--primary)"
            }
          />
        ) : null}
      </div>
    </Card>
  );
}
