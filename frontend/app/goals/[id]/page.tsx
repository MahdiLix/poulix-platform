"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import {
  goalProgressPercent,
  goalRemainingAmount,
  parseGoalAmount,
  statusTone,
  validateGoalMoveAmount,
  type Goal,
} from "@/features/goals/lib/goals";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { balance, currency, refresh } = useWalletBalance();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    void loadGoal();
  }, [params.id]);

  async function loadGoal() {
    if (!getStoredToken()) {
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError("");

    try {
      const data = await api.getGoal(params.id);
      setGoal(data);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadGoals"));
    } finally {
      setPageLoading(false);
    }
  }

  async function handleContribute() {
    if (!goal) return;

    const parsed = parseAmount(amount);
    const validation = validateGoalMoveAmount(parsed, balance, t.messages);
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.contributeToGoal(goal.id, parsed);
      setGoal({ ...response.goal, contributions: goal.contributions });
      setAmount("");
      await refresh();
      await loadGoal();
    } catch (err) {
      setError(localizeError(err, t.messages, "goalContributeFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    if (!goal) return;

    const parsed = parseAmount(amount);
    const saved = parseGoalAmount(goal.savedAmount);
    if (parsed > saved) {
      setError(t.messages.goalSavedBalanceExceeded);
      return;
    }
    const validation = validateGoalMoveAmount(parsed, saved, t.messages);
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.releaseFromGoal(goal.id, parsed);
      setGoal({ ...response.goal, contributions: goal.contributions });
      setAmount("");
      await refresh();
      await loadGoal();
    } catch (err) {
      setError(localizeError(err, t.messages, "goalReleaseFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!goal) return;
    if (!window.confirm(t.goals.confirmCancelGoal)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const updated = await api.cancelGoal(goal.id);
      setGoal({ ...updated, contributions: goal.contributions });
    } catch (err) {
      setError(localizeError(err, t.messages, "goalCancelFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.goals.detailTitle} backHref="/goals" />
        <p className="p-8 text-center text-xs font-semibold text-muted">
          {t.goals.loading}
        </p>
      </AppShell>
    );
  }

  if (!goal) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.goals.detailTitle} backHref="/goals" />
        <div className="space-y-3 p-6">
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
            {error || t.messages.genericError}
          </div>
          <Button variant="secondary" onClick={() => void loadGoal()}>
            {t.common.retry}
          </Button>
        </div>
      </AppShell>
    );
  }

  const saved = parseGoalAmount(goal.savedAmount);
  const target = parseGoalAmount(goal.targetAmount);
  const progress = goalProgressPercent(saved, target);
  const remaining = goalRemainingAmount(saved, target);
  const tone = statusTone(goal.status);
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-surface-muted text-muted";
  const isActive = goal.status === "ACTIVE";
  const canRelease =
    (goal.status === "ACTIVE" || goal.status === "COMPLETED") && saved > 0;

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.goals.detailTitle} backHref="/goals" />

      <div className="space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-lg">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${toneClass}`}
            >
              {t.goals.statuses[goal.status]}
            </span>
            {goal.targetDate ? (
              <span className="text-xs font-medium text-muted">
                {formatDisplayDate(goal.targetDate, language)}
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">{goal.title}</h2>
            {goal.description ? (
              <p className="mt-1 text-xs font-medium text-muted">
                {goal.description}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span>{formatIrr(saved, currency)}</span>
              <span>{formatIrr(target, currency)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-muted">
              <span>
                {progress}% {t.goals.complete}
              </span>
              <span>
                {t.goals.remaining}: {formatIrr(remaining, currency)}
              </span>
            </div>
          </div>
        </Card>

        {isActive || canRelease ? (
          <Card className="space-y-3 p-5">
            <TextField
              label={t.goals.amountIrr}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
            />
            {error ? (
              <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
                {error}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {isActive ? (
                <Button
                  disabled={loading}
                  onClick={() => void handleContribute()}
                >
                  {loading ? t.goals.processing : t.goals.contributeBtn}
                </Button>
              ) : (
                <div />
              )}
              <Button
                variant="secondary"
                disabled={loading || !canRelease}
                onClick={() => void handleRelease()}
              >
                {loading ? t.goals.processing : t.goals.releaseBtn}
              </Button>
            </div>
            {isActive ? (
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => void handleCancel()}
              >
                {t.goals.cancelGoalBtn}
              </Button>
            ) : null}
          </Card>
        ) : null}

        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-foreground">
            {t.goals.contributionHistory}
          </h3>
          {!goal.contributions || goal.contributions.length === 0 ? (
            <p className="text-xs font-medium text-muted">
              {t.goals.noContributions}
            </p>
          ) : (
            <div className="space-y-2">
              {goal.contributions.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {entry.type === "CONTRIBUTE"
                        ? t.goals.contributed
                        : t.goals.released}
                    </p>
                    <p className="text-muted">
                      {formatDisplayDateTime(entry.createdAt, language)}
                    </p>
                  </div>
                  <span
                    className={
                      entry.type === "CONTRIBUTE"
                        ? "font-extrabold text-primary"
                        : "font-extrabold text-success"
                    }
                  >
                    {entry.type === "CONTRIBUTE" ? "-" : "+"}
                    {formatIrr(parseGoalAmount(entry.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
