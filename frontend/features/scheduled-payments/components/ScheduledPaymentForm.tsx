"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { DatePicker } from "@/shared/ui/DatePicker";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
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
import { parseAmount } from "@/features/wallet/lib/wallet";
import { RecentDestinationChips } from "@/features/financial-destinations/components/RecentDestinationChips";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

export function ScheduledPaymentForm() {
  const router = useRouter();
  const { t } = useLanguage();
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

      router.push(`/scheduled/${payment.id}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "scheduledPaymentCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
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
        placeholder="500000"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
      />

      <Select
        label={t.scheduled.frequencyLabel}
        value={frequency}
        onChange={(val) => setFrequency(val as ScheduledPaymentFrequency)}
        options={SCHEDULED_FREQUENCIES.map((value) => ({
          value,
          label: t.scheduled.frequencies[value],
        }))}
      />

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
        label={
          <span>
            {t.withdrawal.paymentCategory}{" "}
            <span className="font-normal text-muted/80">
              ({t.withdrawal.paymentCategoryOptional})
            </span>
          </span>
        }
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
  );
}
