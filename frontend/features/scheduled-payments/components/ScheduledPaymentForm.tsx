"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { DatePicker } from "@/shared/ui/DatePicker";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { flashToast } from "@/shared/ui/Toast";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import { validateRecipientIdentifier } from "@/features/p2p-transfer/lib/transfer";
import {
  SCHEDULED_FREQUENCIES,
  startOfDayIso,
  toIsoDateInput,
  validateScheduledAmount,
  validateScheduledStartDate,
  type ScheduledPaymentFrequency,
} from "@/features/scheduled-payments/lib/scheduledPayments";
import { parseAmount, formatIrr } from "@/features/wallet/lib/wallet";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/cn";
import { localizeDigits } from "@/shared/ui/latinDigits";
import { RecentDestinationChips } from "@/features/financial-destinations/components/RecentDestinationChips";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

export function ScheduledPaymentForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] =
    useState<ScheduledPaymentFrequency>("MONTHLY");
  const [startDate, setStartDate] = useState(toIsoDateInput(new Date()));
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<
    FinancialDestination[]
  >([]);

  const nextRuns = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) return [];
    const dates: Date[] = [start];
    if (frequency === "WEEKLY") {
      dates.push(new Date(start.getTime() + 7 * 86400000));
      dates.push(new Date(start.getTime() + 14 * 86400000));
    } else if (frequency === "MONTHLY") {
      const second = new Date(start);
      second.setMonth(second.getMonth() + 1);
      const third = new Date(start);
      third.setMonth(third.getMonth() + 2);
      dates.push(second, third);
    }
    return dates.slice(0, frequency === "ONCE" ? 1 : 3);
  }, [startDate, frequency]);

  useEffect(() => {
    if (!getStoredToken()) return;
    void api.getRecentDestinations().then((items) => {
      setRecentRecipients(
        items.filter((item) => item.type === "P2P_USER").slice(0, 6),
      );
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (!getStoredToken()) {
      router.push("/login");
      return;
    }

    const recipientError = validateRecipientIdentifier(recipient, t.messages);
    if (recipientError) {
      setFieldError(recipientError);
      return;
    }

    const parsedAmount = parseAmount(amount);
    const amountError = validateScheduledAmount(parsedAmount, t.messages);
    if (amountError) {
      setError(amountError);
      return;
    }

    const startDateError = validateScheduledStartDate(startDate, t.messages);
    if (startDateError) {
      setError(startDateError);
      return;
    }

    setLoading(true);

    try {
      const lookup = await api.lookupUser(recipient);
      if (!lookup.found) {
        if (lookup.self) {
          setFieldError(t.messages.cannotTransferToSelf);
        } else {
          setFieldError(t.messages.recipientNotFound);
        }
        return;
      }

      const payment = await api.createScheduledPayment({
        recipient: recipient.trim(),
        amount: parsedAmount,
        frequency,
        startDate: startOfDayIso(startDate),
        endDate:
          frequency !== "ONCE" && endDate ? startOfDayIso(endDate) : undefined,
        reason: reason.trim() || undefined,
        category: category ? category : undefined,
      });

      flashToast({
        title: t.scheduled.createHeading,
        description: t.messages.success.scheduledCreated,
      });
      router.push(`/scheduled/${payment.id}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "scheduledPaymentCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {recentRecipients.length > 0 ? (
        <RecentDestinationChips
          destinations={recentRecipients}
          onSelect={(destination) => {
            setRecipient(destination.recipientUsername ?? destination.label);
            setFieldError(null);
          }}
        />
      ) : null}

      <TextField
        label={t.send.recipient}
        autoComplete="off"
        placeholder={t.send.recipientPlaceholder}
        value={recipient}
        error={fieldError}
        onChange={(e) => {
          setRecipient(e.target.value);
          setFieldError(null);
          setError("");
        }}
      />

      <TextField
        label={t.send.amountIrr}
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        placeholder={localizeDigits("500000", language)}
        value={amount}
        rightIcon={
          <span className="text-[11px] font-semibold text-muted">IRR</span>
        }
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
      />

      <div>
        <p className="mb-1.5 text-xs font-semibold text-foreground">
          {t.scheduled.frequencyLabel}
        </p>
        <div className="grid grid-cols-3 gap-1 rounded-[10px] border border-border bg-surface-muted p-1">
          {SCHEDULED_FREQUENCIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequency(value)}
              className={cn(
                "h-9 rounded-[8px] text-xs font-semibold transition",
                frequency === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t.scheduled.frequencies[value]}
            </button>
          ))}
        </div>
      </div>

      <DatePicker
        label={t.scheduled.startDate}
        value={startDate}
        onChange={(val) => {
          setStartDate(val);
          setError("");
        }}
        allowClear={false}
      />

      {frequency !== "ONCE" ? (
        <DatePicker
          label={t.scheduled.endDateOptional}
          value={endDate}
          onChange={(val) => setEndDate(val)}
        />
      ) : null}

      <Select
        label={t.withdrawal.paymentCategoryOptional}
        value={category}
        onChange={(val) => setCategory(val)}
        placeholder={t.withdrawal.paymentCategoryOptional}
        options={[
          { value: "", label: t.withdrawal.paymentCategoryOptional },
          ...TRANSACTION_CATEGORIES.map((cat) => ({
            value: cat,
            label: t.history.categories[cat as TransactionCategory],
          })),
        ]}
      />

      <TextField
        label={t.withdrawal.paymentReason}
        placeholder={t.withdrawal.paymentReasonPlaceholder}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {error ? (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.scheduled.creating : t.scheduled.createBtn}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold">{t.scheduled.nextRuns}</p>
          </div>
          {nextRuns.length === 0 ? (
            <p className="text-xs text-muted">{t.scheduled.noExecutions}</p>
          ) : (
            <ol className="space-y-2">
              {nextRuns.map((date, index) => (
                <li
                  key={date.toISOString()}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                      {index + 1}
                    </span>
                    {date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="font-semibold">
                    {parseAmount(amount) > 0
                      ? formatIrr(parseAmount(amount))
                      : "—"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="space-y-2 p-5">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-lg font-bold">{t.scheduled.limitOk}</p>
          </div>
          <p className="text-xs text-muted">{t.scheduled.limitOkHint}</p>
        </Card>
        <p className="flex items-start gap-2 text-[11px] text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t.scheduled.pausedNote}
        </p>
      </div>
    </div>
  );
}
