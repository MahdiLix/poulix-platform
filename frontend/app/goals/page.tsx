"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageSpinner } from "@/shared/ui/Spinner";
import { DonutChart } from "@/shared/ui/DonutChart";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { GoalCard } from "@/features/goals/components/GoalCard";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import type { Goal } from "@/features/goals/lib/goals";
import { parseGoalAmount } from "@/features/goals/lib/goals";

const DONUT_COLORS = [
  "#1a7a68",
  "#4a8ea8",
  "#c4a05a",
  "#c45c4a",
  "#7c6bc4",
  "#2ea88f",
];

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function GoalsPage() {
  const { t } = useLanguage();
  const { status, balance, currency, error: walletError } = useWalletBalance();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    void loadGoals();
  }, []);

  async function loadGoals() {
    if (!getStoredToken()) {
      window.location.replace("/login");
      return;
    }

    setPageStatus("loading");
    setListError(null);

    try {
      const data = await api.getGoals();
      setGoals(data.goals);
      setTotalSaved(parseGoalAmount(data.summary.totalSavedInGoals));
      setPageStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        window.location.replace("/login");
        return;
      }
      setListError(localizeError(err, t.messages, "failedToLoadGoals"));
      setPageStatus("error");
    }
  }

  const availableBalance = balance ?? 0;
  const totalWealth = availableBalance + totalSaved;

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.goals.title}
        backHref="/"
        subtitle={t.goals.description}
        trailing={
          <Link href="/goals/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Goal</span>
            </Button>
          </Link>
        }
      />

      <div className="mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:max-w-5xl lg:p-6">
        <Card className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {t.goals.availableBalance}
                </p>
                <p className="mt-1 text-lg font-bold text-success">
                  {status === "ready"
                    ? formatIrr(availableBalance, currency)
                    : "—"}
                </p>
                {status === "error" && walletError ? (
                  <p className="mt-1 text-[10px] font-medium text-danger">
                    {walletError}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {t.goals.savedInGoals}
                </p>
                <p className="mt-1 text-lg font-bold text-success">
                  {formatIrr(totalSaved, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {t.goals.totalWealth}
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {formatIrr(totalWealth, currency)}
                </p>
              </div>
            </div>

            {goals.length > 1 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <DonutChart
                  size={140}
                  segments={goals.map((goal, i) => ({
                    label: goal.title,
                    value: Math.max(parseGoalAmount(goal.savedAmount), 1),
                    color: DONUT_COLORS[i % DONUT_COLORS.length],
                  }))}
                  centerValue={formatIrr(totalSaved, currency)}
                  centerLabel={t.goals.savedInGoals}
                />
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto">
                  {goals.map((goal, i) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {goal.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        {pageStatus === "loading" ? (
          <PageSpinner label={t.goals.loading} />
        ) : pageStatus === "unauthenticated" ? null : pageStatus === "error" ? (
          <div className="space-y-3 py-8 text-center">
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
              {listError}
            </div>
            <Button variant="secondary" onClick={() => void loadGoals()}>
              {t.common.retry}
            </Button>
          </div>
        ) : goals.length === 0 ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.goals.emptyTitle}
            </p>
            <p className="text-xs text-muted">{t.goals.emptySub}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                color={DONUT_COLORS[i % DONUT_COLORS.length]}
              />
            ))}
          </div>
        )}

        <Link href="/goals/new" className="block lg:hidden">
          <Button className="w-full">{t.goals.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
