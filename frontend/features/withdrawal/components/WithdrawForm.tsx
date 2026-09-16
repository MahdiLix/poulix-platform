"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { AmountField } from "@/shared/ui/AmountField";
import { Select } from "@/shared/ui/Select";
import { api } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { useRateLimitAction, withRemainingLabel } from "@/shared/rate-limit";
import { flashToast } from "@/shared/ui/Toast";
import {
  normalizeAccountNumber,
  normalizeShabaNumber,
  getSavedAccountNumber,
  getSavedShabaNumber,
  saveAccountNumber,
  saveShabaNumber,
  validateAccountNumber,
  validateShabaNumber,
  validateWithdrawAmount,
  listRecentAccountNumbers,
  listRecentShabaNumbers,
  collectWithdrawDestinationValues,
  type WithdrawDestination,
} from "@/features/withdrawal/lib/withdraw";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { RecentValueList } from "@/shared/ui/RecentValueList";
import { Spinner } from "@/shared/ui/Spinner";
import { saveWithdrawalReceipt } from "@/features/wallet/lib/receipt";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import { minRemainingLimit } from "@/features/spending-limits/lib/spendingLimits";
import {
  FundingSourceSelect,
  type FundingSource,
} from "@/features/envelopes/components/FundingSourceSelect";

export function WithdrawForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { status: authStatus } = useUser();
  const { blocked, remainingSeconds } = useRateLimitAction("withdraw");
  const {
    status,
    balance,
    currency,
    error: balanceError,
    refresh,
  } = useWalletBalance();
  const [destination, setDestination] =
    useState<WithdrawDestination>("account");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [shabaNumber, setShabaNumber] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [spendLimits, setSpendLimits] = useState<SpendingLimitSummary[]>([]);
  const [accountFocused, setAccountFocused] = useState(false);
  const [shabaFocused, setShabaFocused] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<string[]>([]);
  const [recentShabas, setRecentShabas] = useState<string[]>([]);
  const [fundingSource, setFundingSource] = useState<FundingSource>({
    label: "",
    balance: null,
  });

  useEffect(() => {
    const destinationId = searchParams.get("destinationId");
    if (!destinationId) {
      setAccountNumber(getSavedAccountNumber());
      setShabaNumber(getSavedShabaNumber());
    }
    setRecentAccounts(listRecentAccountNumbers());
    setRecentShabas(listRecentShabaNumbers());
    if (authStatus === "ready") {
      void Promise.all([
        api.getSavedDestinations().catch(() => []),
        api.getRecentDestinations().catch(() => []),
        api.getSpendingLimits().catch(() => [] as SpendingLimitSummary[]),
      ]).then(async ([savedList, recentList, limits]) => {
        setSpendLimits(limits);
        const candidates = [...savedList, ...recentList].filter(
          (item) => item.type === "BANK_ACCOUNT" || item.type === "SHABA",
        );
        const revealed = await Promise.all(
          candidates
            .slice(0, 8)
            .map((item) => api.getDestinationValue(item.id).catch(() => null)),
        );
        const { accounts, shabas } = collectWithdrawDestinationValues(revealed);
        setRecentAccounts((current) => [...new Set([...current, ...accounts])]);
        setRecentShabas((current) => [...new Set([...current, ...shabas])]);
        if (destinationId) {
          const selected = await api
            .getDestinationValue(destinationId)
            .catch(() => null);
          if (selected?.type === "BANK_ACCOUNT") {
            setDestination("account");
            setAccountNumber(selected.accountNumber);
            saveAccountNumber(selected.accountNumber);
          } else if (selected?.type === "SHABA") {
            setDestination("shaba");
            setShabaNumber(selected.shabaNumber);
            saveShabaNumber(selected.shabaNumber);
          }
        }
      });
    }
  }, [searchParams, authStatus]);

  function destinationFieldError() {
    if (destination === "account") {
      return validateAccountNumber(accountNumber, t.messages);
    }
    return validateShabaNumber(shabaNumber, t.messages);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (authStatus !== "ready") {
      setError(t.withdrawal.pleaseSignInToWithdraw);
      router.push("/login");
      return;
    }

    const destError = destinationFieldError();
    if (destError) {
      setFieldError(destError);
      return;
    }

    setLoading(true);

    try {
      const latestLimits = await api.getSpendingLimits().catch(() => spendLimits);
      setSpendLimits(latestLimits);
      const remainingLimit = minRemainingLimit(latestLimits, [
        "DAILY_WITHDRAWAL",
        "MONTHLY_WITHDRAWAL",
      ]);

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

      const amountError = validateWithdrawAmount(
        amount,
        t.messages,
        sourceBalance ?? undefined,
        remainingLimit,
      );
      if (amountError) {
        setError(amountError);
        return;
      }

      const numericAmount = parseAmount(amount);

      const trimmedReason = reason.trim();
      const meta =
        trimmedReason || category
          ? {
              ...(trimmedReason ? { reason: trimmedReason } : {}),
              ...(category ? { category } : {}),
            }
          : {};

      const payload =
        destination === "account"
          ? {
              amount: numericAmount,
              accountNumber: normalizeAccountNumber(accountNumber),
              envelopeId: fundingSource.envelopeId,
              ...meta,
            }
          : {
              amount: numericAmount,
              shabaNumber: normalizeShabaNumber(shabaNumber),
              envelopeId: fundingSource.envelopeId,
              ...meta,
            };

      const result = await api.withdraw(payload);
      if (
        typeof result?.balance !== "string" &&
        typeof result?.balance !== "number"
      ) {
        throw new Error(t.messages.withdrawalBalanceMissing);
      }
      const remaining = parseAmount(result.balance);
      if (destination === "account") {
        saveAccountNumber(accountNumber);
      } else {
        saveShabaNumber(shabaNumber);
      }
      saveWithdrawalReceipt({
        amount: numericAmount,
        destinationType: destination,
        destination:
          destination === "account"
            ? normalizeAccountNumber(accountNumber)
            : normalizeShabaNumber(shabaNumber),
        balance: remaining,
        currency: typeof result.currency === "string" ? result.currency : "IRR",
        reason: trimmedReason || undefined,
        category: category || undefined,
      });
      flashToast({
        title: t.withdrawal.withdrawalSuccessful,
        description: t.messages.success.withdrawalSuccess,
      });
      router.push("/transfer/success");
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, "withdrawalFailed"));
      void refresh();
      void api
        .getSpendingLimits()
        .then(setSpendLimits)
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  const dailyLimit =
    spendLimits.find((item) => item.type === "DAILY_WITHDRAWAL") ?? null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <WalletBalance
        status={status}
        balance={balance}
        currency={currency}
        error={balanceError}
        onRetry={() => void refresh()}
        variant="heading"
        label={t.common.availableBalance}
      />

      <div className="flex gap-6 border-b border-border">
        <button
          type="button"
          onClick={() => {
            setDestination("account");
            setFieldError(null);
            setError("");
          }}
          className={`-mb-px cursor-pointer border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            destination === "account"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.withdrawal.accountNumber}
        </button>
        <button
          type="button"
          onClick={() => {
            setDestination("shaba");
            setFieldError(null);
            setError("");
          }}
          className={`-mb-px cursor-pointer border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            destination === "shaba"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {t.withdrawal.shabaNumber}
        </button>
      </div>

      {destination === "account" ? (
        <div>
          <TextField
            label={t.withdrawal.accountNumber}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t.withdrawal.accountNumberPlaceholder}
            value={accountNumber}
            error={fieldError}
            onFocus={() => setAccountFocused(true)}
            onBlur={() => setAccountFocused(false)}
            onChange={(e) => {
              const next = e.target.value;
              setAccountNumber(next);
              setFieldError(null);
              saveAccountNumber(next);
              setRecentAccounts(listRecentAccountNumbers());
            }}
          />
          <RecentValueList
            open={accountFocused}
            values={recentAccounts.filter((item) => item !== accountNumber)}
            onSelect={(value) => {
              setAccountNumber(value);
              saveAccountNumber(value);
              setFieldError(null);
              setAccountFocused(false);
            }}
          />
        </div>
      ) : (
        <div>
          <TextField
            label={t.withdrawal.shabaNumber}
            autoComplete="off"
            placeholder={t.withdrawal.shabaNumberPlaceholder}
            value={shabaNumber}
            error={fieldError}
            onFocus={() => setShabaFocused(true)}
            onBlur={() => setShabaFocused(false)}
            onChange={(e) => {
              const next = e.target.value;
              setShabaNumber(next);
              setFieldError(null);
              saveShabaNumber(next);
              setRecentShabas(listRecentShabaNumbers());
            }}
          />
          <RecentValueList
            open={shabaFocused}
            values={recentShabas.filter((item) => item !== shabaNumber)}
            onSelect={(value) => {
              setShabaNumber(value);
              saveShabaNumber(value);
              setFieldError(null);
              setShabaFocused(false);
            }}
          />
        </div>
      )}

      <FundingSourceSelect
        value={fundingSource.envelopeId ?? ""}
        onChange={setFundingSource}
        walletBalance={balance}
        currency={currency}
      />

      <div className="space-y-1">
        <AmountField
          label={t.withdrawal.amountIrr}
          placeholder="10,000"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError("");
          }}
        />
        {(
          fundingSource.envelopeId
            ? fundingSource.balance !== null
            : status === "ready" && balance !== null
        ) ? (
          <button
            type="button"
            onClick={() =>
              setAmount(
                String(
                  Math.trunc(
                    fundingSource.envelopeId
                      ? (fundingSource.balance ?? 0)
                      : (balance ?? 0),
                  ),
                ),
              )
            }
            className="text-xs font-bold text-primary hover:underline"
          >
            {t.withdrawal.maxWithdraw}
          </button>
        ) : null}
      </div>

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

      {error || blocked ? (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {blocked ? t.messages.withdrawRateLimited : error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={
          loading ||
          blocked ||
          status === "unauthenticated" ||
          (!fundingSource.envelopeId && status !== "ready")
        }
      >
        {loading ? (
          <Spinner size="sm" label={t.withdrawal.processing} />
        ) : (
          withRemainingLabel(t.withdrawal.withdrawBtn, remainingSeconds)
        )}
      </Button>

      {dailyLimit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted">
            <span>{t.withdrawal.dailyRemaining}</span>
            <span className="font-bold text-foreground">
              {formatIrr(dailyLimit.remainingAmount, dailyLimit.currency)}
            </span>
          </div>
          <ProgressBar
            value={dailyLimit.usedAmount}
            max={dailyLimit.maxAmount}
          />
        </div>
      ) : status === "ready" && balance !== null ? (
        <p className="text-center text-[11px] font-medium text-muted">
          {t.withdrawal.maxWithdraw}: {formatIrr(balance, currency)}
        </p>
      ) : null}
    </form>
  );
}
