"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Clock,
  CircleDollarSign,
  Eye,
  EyeOff,
  Landmark,
  MoreHorizontal,
  Plus,
  Send,
  Shield,
  Target,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { AreaChart } from "@/shared/ui/AreaChart";
import { DonutChart } from "@/shared/ui/DonutChart";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { DashboardMetricCard } from "@/shared/ui/DashboardMetricCard";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useUser } from "@/shared/user/UserProvider";
import { useRateLimitAction, withRemainingLabel } from "@/shared/rate-limit";
import { formatDisplayDateTime, formatMonthDay } from "@/shared/i18n/dates";
import { cn } from "@/shared/cn";
import { DepositModal } from "@/features/deposit/components/DepositModal";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  transactionReasonLabel,
  transactionTypeLabel,
} from "@/features/wallet/lib/transactionDisplay";
import { WalletIllustration } from "@/shared/ui/WalletIllustration";
import {
  goalProgressPercent,
  parseGoalAmount,
  type Goal,
} from "@/features/goals/lib/goals";
import { parseEnvelopeAmount } from "@/features/envelopes/lib/envelopes";
import {
  activateHomepageOffer,
  getHomepageOffer,
  localizeOfferCopy,
  type HomepageOffer,
} from "@/features/offers/lib/offers";

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  createdAt: string;
  reason?: string | null;
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

function HomeMoveMoneyButtons({
  onTopUp,
  topUpLabel,
  sendLabel,
  withdrawLabel,
}: {
  onTopUp: () => void;
  topUpLabel: string;
  sendLabel: string;
  withdrawLabel: string;
}) {
  const depositLimit = useRateLimitAction("deposit");
  const transferLimit = useRateLimitAction("transfer");
  const withdrawLimit = useRateLimitAction("withdraw");

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        size="sm"
        className="border-0 bg-gradient-to-r from-primary to-secondary px-5 text-white shadow-[0_8px_24px_rgba(18,214,161,0.18)] hover:opacity-90"
        disabled={depositLimit.blocked}
        onClick={() => {
          if (!depositLimit.blocked) onTopUp();
        }}
      >
        <Plus className="me-1.5 h-3.5 w-3.5" />
        {withRemainingLabel(topUpLabel, depositLimit.remainingSeconds)}
      </Button>
      <Link
        href="/send"
        onClick={(event) => {
          if (transferLimit.blocked) event.preventDefault();
        }}
      >
        <Button
          size="sm"
          variant="outline"
          className="border-white/30 bg-transparent text-white hover:bg-white/10"
          disabled={transferLimit.blocked}
        >
          <Send className="me-1.5 h-3.5 w-3.5" />
          {withRemainingLabel(sendLabel, transferLimit.remainingSeconds)}
        </Button>
      </Link>
      <Link
        href="/transfer"
        onClick={(event) => {
          if (withdrawLimit.blocked) event.preventDefault();
        }}
      >
        <Button
          size="sm"
          variant="outline"
          className="border-white/30 bg-transparent text-white hover:bg-white/10"
          disabled={withdrawLimit.blocked}
        >
          {withRemainingLabel(withdrawLabel, withdrawLimit.remainingSeconds)}
        </Button>
      </Link>
    </div>
  );
}

function HomeOfferTopUpButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const { blocked } = useRateLimitAction("deposit");
  return (
    <Button
      size="sm"
      variant="secondary"
      className="mt-3 w-auto border-0 bg-white px-4 text-primary shadow-lg hover:bg-white/90"
      disabled={blocked}
      onClick={() => {
        if (!blocked) onClick();
      }}
    >
      {label}
    </Button>
  );
}

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
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTransactions = transactions.filter(
      (tx) => new Date(tx.createdAt) >= monthStart,
    );

    for (const tx of monthlyTransactions) {
      const amount = parseAmount(tx.amount);
      if (tx.type && EXPENSE_TYPES.has(tx.type)) totalSent += amount;
      if (tx.type && INCOME_TYPES.has(tx.type)) totalReceived += amount;
    }
    return {
      totalTransactions: monthlyTransactions.length,
      totalSent,
      totalReceived,
      net: totalReceived - totalSent,
    };
  }, [transactions]);

  const chartSeries = useMemo(() => {
    const days = chartRange === "7" ? 7 : chartRange === "90" ? 90 : 30;
    const now = new Date();
    const bucketCount = days === 7 ? 7 : days === 30 ? 10 : 9;
    const bucketDays = Math.ceil(days / bucketCount);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index * bucketDays);
      return { date, income: 0, expense: 0 };
    });

    for (const tx of transactions) {
      const createdAt = new Date(tx.createdAt);
      if (
        Number.isNaN(createdAt.getTime()) ||
        createdAt < start ||
        createdAt > now
      ) {
        continue;
      }
      const elapsedDays = Math.floor(
        (createdAt.getTime() - start.getTime()) / 86_400_000,
      );
      const bucket =
        buckets[
          Math.min(bucketCount - 1, Math.floor(elapsedDays / bucketDays))
        ];
      if (!bucket) continue;
      const amount = parseAmount(tx.amount);
      if (INCOME_TYPES.has(tx.type)) bucket.income += amount;
      if (EXPENSE_TYPES.has(tx.type)) bucket.expense += amount;
    }

    const income = buckets.map((bucket) => ({
      label: formatMonthDay(bucket.date, language),
      value: bucket.income,
    }));
    const expense = buckets.map((bucket) => ({
      label: formatMonthDay(bucket.date, language),
      value: bucket.expense,
    }));

    return [
      { label: t.home.income, color: "var(--chart-income)", data: income },
      { label: t.home.expense, color: "var(--chart-expense)", data: expense },
    ];
  }, [transactions, chartRange, language, t.home.income, t.home.expense]);

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
  const displayOffer = offer ? localizeOfferCopy(offer, t.home) : null;

  const openTopUp = (fromOffer = false) => {
    if (!getStoredToken()) router.push("/login");
    else {
      if (fromOffer && offer) activateHomepageOffer(offer, user?.id);
      setIsDepositOpen(true);
    }
  };

  const rightPanel = (
    <>
      <Card className="space-y-3.5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            {t.home.thisMonth}
          </h2>
          <MoreHorizontal className="h-4 w-4 text-muted" />
        </div>
        <DonutChart
          size={158}
          segments={[
            {
              label: t.home.income,
              value: stats.totalReceived,
              color: "var(--secondary)",
            },
            {
              label: t.home.expense,
              value: stats.totalSent,
              color: "var(--accent-purple)",
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

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Target className="h-4 w-4 text-accent-purple" />
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
                  <Link
                    href={`/goals/${goal.id}`}
                    className="block space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-foreground">
                        {goal.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={progress}
                      barClassName="bg-gradient-to-r from-secondary to-primary"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {user?.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="fintech-card flex items-center gap-3 px-4 py-3 text-xs font-semibold text-foreground transition hover:border-primary/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Shield className="h-4 w-4" />
          </span>
          <span className="flex-1">{t.admin.openAdmin}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted rtl:rotate-180" />
        </Link>
      ) : null}
    </>
  );

  return (
    <AppShell variant="dashboard" rightPanel={rightPanel} showTopBar>
      <div className="flex-1 space-y-3 p-3 sm:space-y-4 sm:p-4">
        <section className="fintech-hero relative isolate grid min-h-[8.25rem] grid-cols-[minmax(0,3fr)_minmax(7rem,2fr)] items-center gap-1 overflow-hidden rounded-[14px] px-5 py-3 text-white sm:min-h-[9rem] sm:grid-cols-[minmax(0,1fr)_minmax(11rem,38%)] sm:gap-3 sm:px-7">
          <div className="fintech-grid-pattern pointer-events-none absolute inset-0 z-0 opacity-60" />
          <div className="relative z-10 flex min-w-0 items-center gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.2)] sm:flex">
              <WalletCards className="h-7 w-7 text-cyan-200" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight sm:text-2xl">
                {t.home.welcomeToPoulix}
              </h1>
              <p className="mt-1 text-xs text-blue-100/75 sm:text-sm">
                {stats.net > 0 ? (
                  <>
                    {t.home.walletInsight.split("{percent}")[0]}
                    <span className="font-bold text-secondary">
                      {(
                        (stats.net / Math.max(stats.totalReceived, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                    {t.home.walletInsight.split("{percent}")[1]}
                  </>
                ) : (
                  t.home.walletInsightFlat
                )}
              </p>
            </div>
          </div>
          <WalletIllustration
            priority
            className="relative z-[1] h-28 w-full sm:h-32"
          />
        </section>
        {/* START OF BALANCE CARD */}
        <Card className="relative overflow-hidden border-primary/35 bg-ink-hero p-5 text-primary-foreground">
          <div
            data-ink-hero-glow
            className="pointer-events-none absolute inset-y-0 end-0 w-1/2 bg-[radial-gradient(circle_at_80%_50%,rgba(65,188,255,0.18),transparent_60%)]"
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 sace-y-3">
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
                <p className="flex items-center gap-1 text-[11px] font-medium text-white/70">
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

            <HomeMoveMoneyButtons
              onTopUp={() => openTopUp()}
              topUpLabel={t.home.topUp}
              sendLabel={t.home.send}
              withdrawLabel={t.withdrawal.withdrawTitle}
            />
          </div>
        </Card>

        {displayOffer?.enabled ? (
          <section className="relative isolate grid min-h-44 grid-cols-[minmax(0,3fr)_minmax(8rem,2fr)] overflow-hidden rounded-[14px] border border-cyan-300/25 bg-gradient-to-r from-[#10c995] via-[#087bdc] to-[#175df2] text-primary-foreground shadow-[0_14px_34px_rgba(0,97,219,0.2)] sm:min-h-40 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,38%)]">
            <div className="fintech-grid-pattern pointer-events-none absolute inset-0 opacity-40" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(255,255,255,0.25),transparent_35%)]" />
            <div className="relative z-10 min-w-0 p-5 sm:p-6">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase backdrop-blur">
                {t.home.limitedTime}
              </span>
              <h2 className="mt-3 text-lg font-black leading-tight sm:text-xl">
                {displayOffer.title}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/75 sm:text-sm">
                {displayOffer.description}
              </p>
              <HomeOfferTopUpButton
                label={t.home.topUpNow}
                onClick={() => openTopUp(true)}
              />
            </div>
            <WalletIllustration className="relative z-[1] h-full min-h-44 w-full sm:min-h-40" />
          </section>
        ) : null}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <DashboardMetricCard
            label={t.home.netThisMonth}
            value={formatIrr(stats.net, currency)}
            icon={WalletCards}
            tone={stats.net >= 0 ? "emerald" : "rose"}
            caption={t.home.thisMonth}
            spark={chartSeries[0]?.data.map((d) => d.value) ?? []}
          />
          <DashboardMetricCard
            label={t.home.spent}
            value={formatIrr(stats.totalSent, currency)}
            icon={CircleDollarSign}
            tone="rose"
            caption={t.home.thisMonth}
            spark={chartSeries[1]?.data.map((d) => d.value) ?? []}
          />
          <DashboardMetricCard
            label={t.home.received}
            value={formatIrr(stats.totalReceived, currency)}
            icon={Landmark}
            tone="emerald"
            caption={t.home.thisMonth}
            spark={chartSeries[0]?.data.map((d) => d.value) ?? []}
          />
          <DashboardMetricCard
            label={t.home.activeGoals}
            value={String(activeGoals.length)}
            icon={Target}
            tone="violet"
            caption={t.goals.title}
          />
        </div>

        <Card className="p-4 lg:p-5">
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
            height={220}
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
                          {transactionReasonLabel(tx.reason, t) ||
                            transactionTypeLabel(tx.type, t)}
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
