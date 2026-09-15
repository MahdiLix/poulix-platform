"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { StatCard } from "@/shared/ui/StatCard";
import { AreaChart } from "@/shared/ui/AreaChart";
import { DonutChart } from "@/shared/ui/DonutChart";
import { BarChart } from "@/shared/ui/BarChart";
import { cn } from "@/shared/cn";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import {
  getCalendarYearMonth,
  getLastMonths,
  formatMonthDay,
} from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { parseGoalAmount, type Goal } from "@/features/goals/lib/goals";
import {
  parseEnvelopeAmount,
  type Envelope,
} from "@/features/envelopes/lib/envelopes";
import {
  filterByDayRange,
  percentChange,
  previousDayRange,
} from "@/features/statistics/lib/range";

type Transaction = {
  amount?: string | number;
  type?: string;
  category?: string | null;
  createdAt?: string;
};

type MonthlyPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
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

export default function StatisticsPage() {
  const { t, language } = useLanguage();
  const { currency, balance } = useWalletBalance();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [chartRange, setChartRange] = useState("30");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);

  async function loadTransactions() {
    const token = getStoredToken();
    if (!token) {
      setTransactions(null);
      setSignedIn(false);
      return;
    }

    setSignedIn(true);
    try {
      const [txRes, goalsRes, envelopesRes] = await Promise.all([
        api.getTransactions().catch(() => []),
        api.getGoals().catch(() => ({ goals: [] })),
        api.getEnvelopes().catch(() => ({ envelopes: [] })),
      ]);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setGoals(goalsRes?.goals ?? []);
      setEnvelopes(envelopesRes?.envelopes ?? []);
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  const selectedDays = Number(chartRange);
  const rangeTransactions = useMemo(
    () => filterByDayRange(transactions ?? [], selectedDays),
    [selectedDays, transactions],
  );
  const previousTransactions = useMemo(
    () => previousDayRange(transactions ?? [], selectedDays),
    [selectedDays, transactions],
  );

  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const months = getLastMonths(
      Math.min(12, Math.max(1, Math.ceil(selectedDays / 30))),
      language,
    );
    const buckets = new Map(
      months.map((month) => [month.key, { income: 0, expense: 0 }]),
    );

    rangeTransactions.forEach((tx) => {
      if (!tx.createdAt) return;
      const date = new Date(tx.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const { year, month } = getCalendarYearMonth(date, language);
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) return;

      const amount = parseAmount(tx.amount);
      if (tx.type && INCOME_TYPES.has(tx.type)) {
        bucket.income += amount;
      } else if (tx.type && EXPENSE_TYPES.has(tx.type)) {
        bucket.expense += amount;
      }
    });

    return months.map((month) => ({
      key: month.key,
      label: month.label,
      income: buckets.get(month.key)?.income ?? 0,
      expense: buckets.get(month.key)?.expense ?? 0,
    }));
  }, [language, rangeTransactions, selectedDays]);

  const { incomeTotal, expenseTotal } = useMemo(() => {
    return rangeTransactions.reduce(
      (totals, tx) => {
        const amount = parseAmount(tx.amount);
        if (tx.type && INCOME_TYPES.has(tx.type)) {
          totals.incomeTotal += amount;
        } else if (tx.type && EXPENSE_TYPES.has(tx.type)) {
          totals.expenseTotal += amount;
        }
        return totals;
      },
      { incomeTotal: 0, expenseTotal: 0 },
    );
  }, [rangeTransactions]);

  const previousTotals = useMemo(
    () =>
      previousTransactions.reduce(
        (totals, tx) => {
          const amount = parseAmount(tx.amount);
          if (tx.type && INCOME_TYPES.has(tx.type)) totals.income += amount;
          if (tx.type && EXPENSE_TYPES.has(tx.type)) totals.expense += amount;
          return totals;
        },
        { income: 0, expense: 0 },
      ),
    [previousTransactions],
  );

  const categorySpend = useMemo(() => {
    if (!rangeTransactions.length) return [];
    const totals = new Map<string, number>();
    for (const tx of rangeTransactions) {
      if (!tx.type || !EXPENSE_TYPES.has(tx.type) || !tx.category) continue;
      totals.set(
        tx.category,
        (totals.get(tx.category) ?? 0) + parseAmount(tx.amount ?? 0),
      );
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [rangeTransactions]);

  const chartSeries = useMemo(() => {
    if (selectedDays >= 365) {
      return [
        {
          label: t.statistics.income,
          color: "var(--chart-income)",
          data: monthlyData.map((p) => ({ label: p.label, value: p.income })),
        },
        {
          label: t.statistics.expense,
          color: "var(--chart-expense)",
          data: monthlyData.map((p) => ({ label: p.label, value: p.expense })),
        },
      ];
    }

    const days = selectedDays;
    const bucketCount = days <= 7 ? 7 : days <= 30 ? 10 : 9;
    const bucketDays = Math.ceil(days / bucketCount);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index * bucketDays);
      return { date, income: 0, expense: 0 };
    });

    for (const tx of rangeTransactions) {
      if (!tx.createdAt) continue;
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
      if (tx.type && INCOME_TYPES.has(tx.type)) bucket.income += amount;
      if (tx.type && EXPENSE_TYPES.has(tx.type)) bucket.expense += amount;
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
      {
        label: t.statistics.income,
        color: "var(--chart-income)",
        data: income,
      },
      {
        label: t.statistics.expense,
        color: "var(--chart-expense)",
        data: expense,
      },
    ];
  }, [
    language,
    monthlyData,
    rangeTransactions,
    selectedDays,
    t.statistics.expense,
    t.statistics.income,
  ]);

  const rangeOptions = [
    { key: "7", label: t.statistics.days7 },
    { key: "30", label: t.statistics.days30 },
    { key: "90", label: t.statistics.days90 },
    { key: "365", label: t.statistics.days1y },
  ];

  return (
    <AppShell>
      <HeaderBar
        title={t.statistics.statsTitle}
        backHref="/"
        subtitle={t.statistics.overview}
        trailing={
          <div className="flex items-center gap-1 rounded-[10px] border border-border bg-surface p-1">
            {rangeOptions.map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => setChartRange(range.key)}
                className={cn(
                  "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  chartRange === range.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t.statistics.totalIncome}
            value={formatIrr(incomeTotal, currency)}
            trend={percentChange(incomeTotal, previousTotals.income)}
            icon={ArrowDown}
            iconClassName="bg-success-soft text-success"
          />
          <StatCard
            label={t.statistics.totalExpenses}
            value={formatIrr(expenseTotal, currency)}
            trend={percentChange(expenseTotal, previousTotals.expense)}
            icon={ArrowUp}
            iconClassName="bg-danger-soft text-danger"
          />
          <StatCard
            label={t.statistics.netBalance}
            value={formatIrr(incomeTotal - expenseTotal, currency)}
            icon={ArrowDown}
            iconClassName="bg-primary-soft text-primary"
          />
          <StatCard
            label={t.statistics.totalTransactions}
            value={String(rangeTransactions.length)}
            icon={ArrowUp}
            iconClassName="bg-accent-amber-soft text-accent-amber"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="space-y-4 p-5 lg:col-span-8 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-foreground lg:text-base">
                {t.home.cashFlow}
              </h3>
            </div>

            <AreaChart
              series={chartSeries}
              height={220}
              showLegend
              formatValue={(value) => formatIrr(value, currency)}
            />
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-1">
            <Card className="flex flex-col items-center justify-center space-y-3 p-5">
              <DonutChart
                size={140}
                segments={[
                  {
                    label: t.statistics.income,
                    value: Math.max(incomeTotal, 0),
                    color: "var(--chart-income)",
                  },
                  {
                    label: t.statistics.expense,
                    value: Math.max(expenseTotal, 0),
                    color: "var(--chart-expense)",
                  },
                ]}
                centerValue={formatIrr(
                  incomeTotal - expenseTotal,
                  currency,
                ).replace(" IRR", "")}
                centerLabel={t.statistics.netBalance}
                formatValue={(value) => formatIrr(value, currency)}
              />
            </Card>
            <Card className="space-y-2 p-5">
              <span className="h-2 w-2 rounded-full bg-success" />
              <p className="text-[11px] font-medium text-muted">
                {t.statistics.income}
              </p>
              <p className="text-xl font-bold text-success">
                {formatIrr(incomeTotal, currency)}
              </p>
            </Card>
            <Card className="space-y-2 p-5">
              <span className="h-2 w-2 rounded-full bg-danger" />
              <p className="text-[11px] font-medium text-muted">
                {t.statistics.expense}
              </p>
              <p className="text-xl font-bold text-danger">
                {formatIrr(expenseTotal, currency)}
              </p>
            </Card>
            <Card className="space-y-2 p-5">
              <span className="h-2 w-2 rounded-full bg-success" />
              <p className="text-[11px] font-medium text-muted">
                {t.statistics.netBalance}
              </p>
              <p className="text-xl font-bold text-success">
                {formatIrr(incomeTotal - expenseTotal, currency)}
              </p>
            </Card>
          </div>
        </div>

        {signedIn && categorySpend.length > 0 ? (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold">
              {t.statistics.categoryBreakdown}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categorySpend.map(([category, amount]) => {
                const pct =
                  expenseTotal > 0
                    ? Math.round((amount / expenseTotal) * 100)
                    : 0;
                return (
                  <div
                    key={category}
                    className="rounded-xl border border-border bg-surface-muted/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">
                        {t.history.categories[
                          category as keyof typeof t.history.categories
                        ] ?? category}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {pct}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold">
                      {formatIrr(amount, currency)}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-bold">{t.common.totalBalance}</h3>
            <DonutChart
              size={150}
              segments={[
                {
                  label: t.common.availableBalance,
                  value: Math.max(balance ?? 0, 0),
                  color: "var(--chart-income)",
                },
                {
                  label: t.statistics.savingGoals,
                  value: goals.reduce(
                    (sum, goal) => sum + parseGoalAmount(goal.savedAmount),
                    0,
                  ),
                  color: "var(--accent-amber)",
                },
                {
                  label: t.statistics.virtualEnvelopes,
                  value: envelopes.reduce(
                    (sum, envelope) =>
                      sum + parseEnvelopeAmount(envelope.allocatedAmount),
                    0,
                  ),
                  color: "var(--accent-teal)",
                },
              ]}
              centerValue={formatIrr(balance ?? 0, currency).replace(
                " IRR",
                "",
              )}
              centerLabel={t.common.totalBalance}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-bold">{t.statistics.savingGoals}</h3>
            <BarChart
              data={
                goals.length
                  ? goals.slice(0, 6).map((goal) => ({
                      label: goal.title,
                      value: parseGoalAmount(goal.savedAmount),
                      color: "var(--accent-amber)",
                    }))
                  : [{ label: "—", value: 0, color: "var(--accent-amber)" }]
              }
              height={180}
              formatValue={(value) => formatIrr(value, currency)}
            />
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-bold">
              {t.statistics.virtualEnvelopes}
            </h3>
            <BarChart
              data={
                envelopes.length
                  ? envelopes.slice(0, 6).map((envelope) => ({
                      label: envelope.name,
                      value: parseEnvelopeAmount(envelope.allocatedAmount),
                      color: "var(--accent-teal)",
                    }))
                  : [{ label: "—", value: 0, color: "var(--accent-teal)" }]
              }
              height={180}
              formatValue={(value) => formatIrr(value, currency)}
            />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
