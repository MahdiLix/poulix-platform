"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PiggyBank, Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { GoalCard } from "@/features/goals/components/GoalCard";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import type { Goal } from "@/features/goals/lib/goals";
import { parseGoalAmount } from "@/features/goals/lib/goals";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function GoalsPage() {
  const { t } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    void loadGoals();
  }, []);

  async function loadGoals() {
    if (!getStoredToken()) {
      setPageStatus("unauthenticated");
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
        setPageStatus("unauthenticated");
        return;
      }
      setListError(localizeError(err, t.messages, "failedToLoadGoals"));
      setPageStatus("error");
    }
  }

  const availableBalance = balance ?? 0;
  const totalWealth = availableBalance + totalSaved;

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.goals.title}
        backHref="/"
        variant="hero"
        trailing={
          <Link
            href="/goals/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition hover:bg-white/20"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="mt-2 flex flex-1 flex-col space-y-4 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t.goals.subtitle}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.goals.description}
            </p>
          </div>
        </div>

        <Card className="space-y-3 p-4">
          <WalletBalance
            status={status}
            balance={balance}
            currency={currency}
            error={error}
            onRetry={() => void refresh()}
            variant="compact"
            label={t.goals.availableBalance}
          />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-surface-muted p-3">
              <p className="font-semibold text-muted">{t.goals.savedInGoals}</p>
              <p className="text-sm font-bold text-foreground">
                {formatIrr(totalSaved, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-muted p-3">
              <p className="font-semibold text-muted">{t.goals.totalWealth}</p>
              <p className="text-sm font-bold text-foreground">
                {formatIrr(totalWealth, currency)}
              </p>
            </div>
          </div>
        </Card>

        {pageStatus === "loading" ? (
          <p className="py-8 text-center text-xs font-semibold text-muted">
            {t.goals.loading}
          </p>
        ) : pageStatus === "unauthenticated" ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.goals.signInRequired}
            </p>
            <Link href="/login">
              <Button className="w-full">{t.common.signIn}</Button>
            </Link>
          </div>
        ) : pageStatus === "error" ? (
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
          <div className="space-y-3">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}

        <Link href="/goals/new" className="block">
          <Button className="w-full">{t.goals.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
