"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { getCalendarYearMonth, getLastMonths } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";

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

function axisLabel(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / exponent;
  const nice =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 4
          ? 4
          : normalized <= 5
            ? 5
            : 10;
  return nice * exponent;
}

export default function StatisticsPage() {
  const { t, language } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  async function loadTransactions() {
    const token = getStoredToken();
    if (!token) {
      setTransactions(null);
      setSignedIn(false);
      return;
    }

    setSignedIn(true);
    try {
      const txRes = await api.getTransactions();
      if (!Array.isArray(txRes)) {
        setTransactions([]);
        return;
      }
      setTransactions(txRes);
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const months = getLastMonths(6, language);

    const buckets = new Map(
      months.map((month) => [month.key, { income: 0, expense: 0 }]),
    );

    (transactions ?? []).forEach((tx) => {
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
  }, [language, transactions]);

  const { incomeTotal, expenseTotal } = useMemo(() => {
    return (transactions ?? []).reduce(
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
  }, [transactions]);

  const categorySpend = useMemo(() => {
    if (!transactions) {
      return [];
    }
    const totals = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.type || !EXPENSE_TYPES.has(tx.type)) {
        continue;
      }
      if (!tx.category) {
        continue;
      }
      totals.set(
        tx.category,
        (totals.get(tx.category) ?? 0) + parseAmount(tx.amount ?? 0),
      );
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [transactions]);

  const maxY = niceMax(
    Math.max(
      ...monthlyData.map((point) => Math.max(point.income, point.expense)),
      0,
    ),
  );
  const ticks = [maxY, maxY * 0.75, maxY * 0.5, maxY * 0.25, 0];

  return (
    <AppShell>
      <HeaderBar title={t.statistics.statsTitle} backHref="/" />

      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <WalletBalance
          status={status}
          balance={balance}
          currency={currency}
          error={error}
          onRetry={() => void refresh()}
          variant="heading"
          label={t.common.totalBalance}
        />

        <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
          <Card className="space-y-4 p-6 shadow-md lg:col-span-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground lg:text-base">
                  {t.statistics.overview}
                </h3>
              </div>
              <button className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-95">
                <span>{t.statistics.month}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="pb-2 pt-4">
              <div className="relative flex h-52 items-end justify-between border-b border-border px-2">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] font-medium text-muted">
                  {ticks.map((tick) => (
                    <div
                      key={tick}
                      className="w-full border-b border-dashed border-border pt-1 last:border-b-0"
                    >
                      {axisLabel(tick)}
                    </div>
                  ))}
                </div>

                {monthlyData.map((point) => {
                  const incomePct = maxY ? (point.income / maxY) * 100 : 0;
                  const expensePct = maxY ? (point.expense / maxY) * 100 : 0;

                  return (
                    <div
                      key={point.key}
                      className="group z-10 flex h-full items-end gap-1.5 pb-0.5"
                    >
                      <div
                        style={{ height: `${incomePct}%` }}
                        className="w-3 rounded-t-full bg-chart-income transition-all lg:w-4"
                      />
                      <div
                        style={{ height: `${expensePct}%` }}
                        className="w-3 rounded-t-full bg-chart-expense transition-all lg:w-4"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-1 px-2 pt-2 text-[11px] font-semibold text-muted">
                {monthlyData.map((point) => (
                  <span
                    key={point.key}
                    className="min-w-0 flex-1 truncate text-center"
                  >
                    {point.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-income" />
                <span className="text-muted">{t.statistics.income}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-expense" />
                <span className="text-muted">{t.statistics.expense}</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-4 lg:grid-cols-1 lg:content-start lg:gap-6">
            <div className="relative space-y-3 overflow-hidden rounded-3xl bg-chart-income p-6 text-primary-foreground shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <ArrowDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/70">
                  {t.statistics.income}
                </p>
                <h3 className="text-xl font-bold tracking-tight">
                  {formatIrr(incomeTotal, currency)}
                </h3>
              </div>
            </div>

            <div className="relative space-y-3 overflow-hidden rounded-3xl bg-chart-expense-gradient p-6 text-primary-foreground shadow-md shadow-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <ArrowUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/80">
                  {t.statistics.expense}
                </p>
                <h3 className="text-xl font-bold tracking-tight">
                  {formatIrr(expenseTotal, currency)}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {signedIn && categorySpend.length > 0 ? (
          <Card className="p-4 lg:col-span-12">
            <h3 className="mb-3 text-sm font-bold">
              {t.statistics.categoryBreakdown}
            </h3>
            <ul className="space-y-2">
              {categorySpend.map(([category, amount]) => (
                <li
                  key={category}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-muted">
                    {t.history.categories[
                      category as keyof typeof t.history.categories
                    ] ?? category}
                  </span>
                  <span className="font-bold">
                    {formatIrr(amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
