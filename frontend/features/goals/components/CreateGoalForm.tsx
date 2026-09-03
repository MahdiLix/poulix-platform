"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { DatePicker } from "@/shared/ui/DatePicker";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { parseAmount } from "@/features/wallet/lib/wallet";
import {
  startOfDayIso,
  validateGoalTargetAmount,
  validateGoalTitle,
} from "@/features/goals/lib/goals";

export function CreateGoalForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    const parsedTarget = parseAmount(targetAmount);
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

      router.push(`/goals/${goal.id}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "goalCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <TextField
        label={t.goals.goalTitle}
        placeholder={t.goals.goalTitlePlaceholder}
        value={title}
        error={fieldError}
        onChange={(e) => {
          setTitle(e.target.value);
          setFieldError(null);
          setError("");
        }}
      />

      <TextField
        label={t.goals.targetAmount}
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
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
        onChange={(e) => setDescription(e.target.value)}
      />

      <DatePicker
        label={t.goals.targetDateOptional}
        value={targetDate}
        onChange={(val) => setTargetDate(val)}
      />

      {error ? (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t.goals.creating : t.goals.createBtn}
      </Button>
    </form>
  );
}
