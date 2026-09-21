"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Eye, EyeOff, Check, User } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AmountField } from "@/shared/ui/AmountField";
import { Select } from "@/shared/ui/Select";
import { Badge } from "@/shared/ui/Badge";
import { api } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { useRateLimitAction } from "@/shared/rate-limit";
import { minRemainingLimit } from "@/features/spending-limits/lib/spendingLimits";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import {
  validateRecipientIdentifier,
  validateTransferAmount,
  writeSendConfirmPayload,
} from "@/features/p2p-transfer/lib/transfer";
import type { TransferRecipient } from "@/features/p2p-transfer/lib/transfer";
import {
  FundingSourceSelect,
  type FundingSource,
} from "@/features/envelopes/components/FundingSourceSelect";
import { RecentDestinationChips } from "@/features/financial-destinations/components/RecentDestinationChips";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";
import { redirectToLoginForAction } from "@/features/auth/lib/login-redirect";

export function SendForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { status: authStatus } = useUser();
  const { blocked } = useRateLimitAction("transfer");
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
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [recipientUser, setRecipientUser] = useState<TransferRecipient | null>(
    null,
  );
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [fundingSource, setFundingSource] = useState<FundingSource>({
    label: "",
    balance: null,
  });
  const [destinations, setDestinations] = useState<FinancialDestination[]>([]);

  useEffect(() => {
    if (authStatus !== "ready") return;
    void Promise.all([
      api.getSavedDestinations().catch(() => []),
      api.getRecentDestinations().catch(() => []),
    ]).then(([saved, recent]) => {
      const unique = new Map<string, FinancialDestination>();
      [...saved, ...recent]
        .filter((item) => item.type === "P2P_USER" && item.recipientUsername)
        .forEach((item) => unique.set(item.recipientUsername!, item));
      setDestinations([...unique.values()].slice(0, 8));
    });
  }, [authStatus]);

  useEffect(() => {
    const destinationId = searchParams.get("destinationId");
    if (!destinationId || authStatus !== "ready") return;
    void api
      .getDestinationValue(destinationId)
      .then((value) => {
        if (value?.type === "P2P_USER" && value.recipientUsername) {
          setRecipient(value.recipientUsername);
          setFieldError(null);
        }
      })
      .catch(() => {});
  }, [searchParams, authStatus]);

  useEffect(() => {
    const trimmed = recipient.trim();
    if (!trimmed || trimmed.length < 3) {
      setRecipientUser(null);
      return;
    }

    const timer = setTimeout(() => {
      setRecipientLoading(true);
      api
        .lookupUser(trimmed)
        .then((result) => {
          if (result.found) {
            setRecipientUser(result.user);
          } else {
            setRecipientUser(null);
          }
        })
        .catch(() => setRecipientUser(null))
        .finally(() => setRecipientLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [recipient]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (authStatus === "unauthenticated") {
      redirectToLoginForAction("/send", t.common.loginToContinue);
      return;
    }
    if (authStatus !== "ready") {
      return;
    }

    const recipientError = validateRecipientIdentifier(recipient, t.messages);
    if (recipientError) {
      setFieldError(recipientError);
      return;
    }

    const parsedAmount = parseAmount(amount);

    setLoading(true);

    try {
      let sourceBalance = fundingSource.envelopeId
        ? fundingSource.balance
        : balance;

      if (fundingSource.envelopeId) {
        const envelopes = await api.getEnvelopes().catch(() => null);
        const envelope = envelopes?.envelopes?.find(
          (item) =>
            item.id === fundingSource.envelopeId && item.status === "ACTIVE",
        );
        if (envelopes && !envelope) {
          setError(t.messages.envelopeNotActive);
          return;
        }
        if (envelope) {
          sourceBalance = parseAmount(envelope.allocatedAmount);
        }
      } else {
        const live = await api.getBalance();
        sourceBalance = parseAmount(live.balance);
      }

      const latestLimits = await api.getSpendingLimits().catch(() => []);
      const remainingLimit = minRemainingLimit(latestLimits, [
        "DAILY_TRANSFER",
        "MONTHLY_TRANSFER",
      ]);
      const amountError = validateTransferAmount(
        parsedAmount,
        sourceBalance,
        t.messages,
        remainingLimit,
      );
      if (amountError) {
        setError(amountError);
        return;
      }

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
        envelopeId: fundingSource.envelopeId,
        fundingSourceLabel: fundingSource.label || undefined,
        fundingSourceBalance: sourceBalance ?? undefined,
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
          <Send className="h-5 w-5 rtl:rotate-180" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {t.send.sendToUser}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t.send.sendSubtitle}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            {t.common.availableBalance}
          </p>
          <button
            type="button"
            onClick={() => setBalanceVisible((v) => !v)}
            className="cursor-pointer rounded-lg p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label="Toggle balance visibility"
          >
            {balanceVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="min-h-[2.5rem]">
          {status === "error" && balance === null ? (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-danger">
                {balanceError || t.common.couldNotLoadBalance}
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t.common.retry}
              </button>
            </div>
          ) : (status === "loading" || status === "idle") &&
            balance === null ? (
            <p className="amount text-2xl font-bold tracking-tight text-foreground">
              {t.common.loadingBalance}
            </p>
          ) : balanceVisible ? (
            <p className="amount text-2xl font-bold tracking-tight text-foreground">
              {formatIrr(balance ?? 0, currency)}
            </p>
          ) : (
            <p className="amount text-2xl font-bold tracking-widest text-foreground">
              ••••••
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <RecentDestinationChips
          destinations={destinations}
          onSelect={(destination) => {
            setRecipient(destination.recipientUsername ?? "");
            setFieldError(null);
          }}
        />
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

        {recipientLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-surface" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-surface" />
            </div>
          </div>
        ) : recipientUser ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-soft px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {recipientUser.username}
              </p>
              <p className="truncate text-xs text-muted">
                {recipientUser.email}
              </p>
            </div>
            <Badge variant="success" className="shrink-0">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Verified user
              </span>
            </Badge>
          </div>
        ) : null}
      </div>

      <FundingSourceSelect
        value={fundingSource.envelopeId ?? ""}
        onChange={setFundingSource}
        walletBalance={balance}
        currency={currency}
      />

      <AmountField
        label={t.send.amountIrr}
        placeholder="10,000"
        value={amount}
        hint={
          balance !== null && balance > 0
            ? `Min 10,000 · Max ${formatIrr(balance, currency)}`
            : "Min 10,000"
        }
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
      />

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

      <div>
        <label
          htmlFor="payment-reason"
          className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted"
        >
          {t.withdrawal.paymentReason}
        </label>
        <textarea
          id="payment-reason"
          rows={3}
          placeholder={t.withdrawal.paymentReasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full resize-none rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-foreground transition placeholder:text-muted/70 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      {error ? (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={
          loading ||
          blocked ||
          authStatus === "loading" ||
          (authStatus === "ready" &&
            !fundingSource.envelopeId &&
            status !== "ready")
        }
      >
        {loading ? t.send.lookingUpRecipient : t.send.continueBtn}
      </Button>
    </form>
  );
}
