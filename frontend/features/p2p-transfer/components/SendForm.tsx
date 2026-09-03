"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { api, getStoredToken } from "@/shared/api";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError, formatMessage } from "@/shared/i18n/localizeError";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import {
  validateRecipientIdentifier,
  validateTransferAmount,
  writeSendConfirmPayload,
} from "@/features/p2p-transfer/lib/transfer";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

export function SendForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    status,
    balance,
    currency,
    error: balanceError,
    refresh,
  } = useWalletBalance();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
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
    void Promise.all([
      api.getRecentDestinations().catch(() => []),
      api.getSavedDestinations().catch(() => []),
    ]).then(([recentList, savedList]) => {
      const merged = [
        ...savedList.filter((item) => item.type === "P2P_USER"),
        ...recentList.filter(
          (item) =>
            item.type === "P2P_USER" &&
            !savedList.some((s) => s.id === item.id),
        ),
      ];
      setRecentRecipients(merged.slice(0, 8));
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (!getStoredToken()) {
      setError(t.send.pleaseSignInToSend);
      router.push("/login");
      return;
    }

    const recipientError = validateRecipientIdentifier(recipient, t.messages);
    if (recipientError) {
      setFieldError(recipientError);
      return;
    }

    const parsedAmount = parseAmount(amount);
    const amountError = validateTransferAmount(
      parsedAmount,
      balance,
      t.messages,
    );
    if (amountError) {
      setError(amountError);
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

      writeSendConfirmPayload({
        recipient: recipient.trim(),
        recipientUser: lookup.user,
        amount: parsedAmount,
        reason: reason.trim() || undefined,
        category: category ? (category as TransactionCategory) : undefined,
      });

      router.push("/send/confirm");
    } catch (err) {
      setError(localizeError(err, t.messages, "transferFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <WalletBalance
        status={status}
        balance={balance}
        currency={currency}
        error={balanceError}
        onRetry={() => void refresh()}
        variant="compact"
        label={t.common.availableBalance}
      />

      {recentRecipients.length > 0 ? (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted">
            {t.destinations.recentTitle}:
          </span>
          <div className="flex flex-wrap gap-2">
            {recentRecipients.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRecipient(item.recipientUsername ?? item.label);
                  setFieldError(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary-soft hover:text-primary active:scale-95 cursor-pointer"
              >
                <span>{item.label}</span>
                {item.recipientUsername &&
                item.recipientUsername !== item.label ? (
                  <span className="font-mono text-[10px] text-muted">
                    (@{item.recipientUsername})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
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
        placeholder="10000"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
      />

      {balance !== null && balance > 0 ? (
        <p className="text-[11px] font-medium text-muted">
          {formatMessage(t.withdrawal.maxWithdraw, {
            max: formatIrr(balance, currency),
          })}
        </p>
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
        {loading ? t.send.lookingUpRecipient : t.send.continueBtn}
      </Button>
    </form>
  );
}
