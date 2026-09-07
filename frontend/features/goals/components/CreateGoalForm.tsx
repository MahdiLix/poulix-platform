"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock, Info } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AmountField } from "@/shared/ui/AmountField";
import { DatePicker } from "@/shared/ui/DatePicker";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { DonutChart } from "@/shared/ui/DonutChart";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { flashToast } from "@/shared/ui/Toast";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import {
  startOfDayIso,
  validateGoalTargetAmount,
  validateGoalTitle,
} from "@/features/goals/lib/goals";

export function CreateGoalForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { status, balance, currency } = useWalletBalance();
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedTarget = parseAmount(targetAmount) || 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (!getStoredToken()) {
      router.push("/login");
      return;
    }

    const titleError = validateGoalTitle(title, t.messages);
    if (titleError) {
      setFieldError(titleError);
      return;
    }

    const amountError = validateGoalTargetAmount(parsedTarget, t.messages);
    if (amountError) {
      setError(amountError);
      return;
    }

    setLoading(true);

    try {
      const goal = await api.createGoal({
        title: title.trim(),
        targetAmount: parsedTarget,
        description: description.trim() || undefined,
        targetDate: targetDate ? startOfDayIso(targetDate) : undefined,
      });
      const goalId = goal?.id;
      if (!goalId) {
        throw new Error(t.messages.goalCreateFailed);
      }
      flashToast({ title: t.messages.success.goalCreated });
      router.replace(`/goals/${goalId}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "goalCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <TextField
            label={t.goals.goalTitle}
            placeholder={t.goals.goalTitlePlaceholder}
            value={title}
            error={fieldError}
            maxLength={50}
            hint={`${title.length}/50`}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldError(null);
              setError("");
            }}
          />

          <AmountField
            label={t.goals.targetAmount}
            min="1"
            step="1"
            placeholder="1000000"
            value={targetAmount}
            onChange={(e) => {
              setTargetAmount(e.target.value);
              setError("");
            }}
          />

          <TextField
            label={t.goals.descriptionOptional}
            placeholder={t.goals.descriptionPlaceholder}
            value={description}
            maxLength={150}
            hint={`${description.length}/150`}
            onChange={(e) => setDescription(e.target.value)}
          />

          <DatePicker
            label={t.goals.targetDateOptional}
            value={targetDate}
            onChange={(val) => setTargetDate(val)}
          />

          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t.goals.availableBalance}
                </p>
                <p className="text-[11px] text-muted">
                  {t.goals.contributeAfterCreate}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-bold text-primary">
              {status === "ready" && balance !== null
                ? formatIrr(balance, currency)
                : "—"}
            </p>
          </div>

          {error ? (
            <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.goals.creating : t.goals.createBtn}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{t.goals.goalPreview}</p>
            <Badge variant="success">{t.goals.statuses.ACTIVE}</Badge>
          </div>
          <DonutChart
            size={140}
            centerLabel={t.goals.complete}
            centerValue="0%"
            segments={[]}
          />
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">{t.goals.targetAmount}</dt>
              <dd className="font-semibold">
                {parsedTarget > 0 ? formatIrr(parsedTarget) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.goals.savedInGoals}</dt>
              <dd className="font-semibold">{formatIrr(0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.goals.remaining}</dt>
              <dd className="font-semibold">
                {parsedTarget > 0 ? formatIrr(parsedTarget) : "—"}
              </dd>
            </div>
            {targetDate ? (
              <div className="flex justify-between">
                <dt className="text-muted">{t.goals.targetDateOptional}</dt>
                <dd className="font-semibold">
                  {formatDisplayDate(targetDate, language)}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
        <Card className="space-y-2 p-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted" />
          <p className="text-sm font-bold">{t.goals.noContributionsHint}</p>
          <p className="text-xs text-muted">{t.goals.contributeAfterCreate}</p>
        </Card>
      </div>
    </div>
  );
}
