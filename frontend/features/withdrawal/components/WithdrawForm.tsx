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
import { localizeError } from "@/shared/i18n/localizeError";
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
  type WithdrawDestination,
} from "@/features/withdrawal/lib/withdraw";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { RecentValueList } from "@/shared/ui/RecentValueList";
import { Spinner } from "@/shared/ui/Spinner";
import { localizeDigits } from "@/shared/ui/latinDigits";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";

export function WithdrawForm() {
  const router = useRouter();
  const { t, language } = useLanguage();
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
  const [dailyLimit, setDailyLimit] = useState<SpendingLimitSummary | null>(
    null,
  );
  const [accountFocused, setAccountFocused] = useState(false);
  const [shabaFocused, setShabaFocused] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<string[]>([]);
  const [recentShabas, setRecentShabas] = useState<string[]>([]);

  useEffect(() => {
    setAccountNumber(getSavedAccountNumber());
    setShabaNumber(getSavedShabaNumber());
    setRecentAccounts(listRecentAccountNumbers());
    setRecentShabas(listRecentShabaNumbers());
    if (getStoredToken()) {
      void Promise.all([
        api.getSavedDestinations().catch(() => []),
        api.getRecentDestinations().catch(() => []),
        api.getSpendingLimits().catch(() => [] as SpendingLimitSummary[]),
      ]).then(async ([savedList, recentList, limits]) => {
        setDailyLimit(
          limits.find((item) => item.type === "DAILY_WITHDRAWAL") ?? null,
        );
        const candidates = [...savedList, ...recentList].filter(
          (item) => item.type === "BANK_ACCOUNT" || item.type === "SHABA",
        );
        const revealed = await Promise.all(
          candidates.slice(0, 8).map((item) =>
            api.getDestinationValue(item.id).catch(() => null),
          ),
        );
        const accounts = revealed
          .filter(
            (item): item is { type: "BANK_ACCOUNT"; accountNumber: string } =>
              item?.type === "BANK_ACCOUNT",
          )
          .map((item) => item.accountNumber);
        const shabas = revealed
          .filter(
            (item): item is { type: "SHABA"; shabaNumber: string } =>
              item?.type === "SHABA",
          )
          .map((item) => item.shabaNumber);
        setRecentAccounts((current) =>
          [...new Set([...current, ...accounts])],
        );
        setRecentShabas((current) => [...new Set([...current, ...shabas])]);
      });
    }
  }, [destination]);

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

    if (!getStoredToken()) {
      setError(t.withdrawal.pleaseSignInToWithdraw);
      router.push("/login");
      return;
    }

    const destError = destinationFieldError();
    if (destError) {
      setFieldError(destError);
      return;
    }

    const amountError = validateWithdrawAmount(
      amount,
      t.messages,
      status === "ready" ? balance : undefined,
    );
    if (amountError) {
      setError(amountError);
      return;
    }

    const numericAmount = Number(amount);
    setLoading(true);

    try {
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
              ...meta,
            }
          : {
              amount: numericAmount,
              shabaNumber: normalizeShabaNumber(shabaNumber),
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
      const params = new URLSearchParams({
        amount: String(numericAmount),
        type: destination,
        destination:
          destination === "account"
            ? normalizeAccountNumber(accountNumber)
            : normalizeShabaNumber(shabaNumber),
        balance: String(remaining),
        currency: typeof result.currency === "string" ? result.currency : "IRR",
      });
      if (trimmedReason) params.set("reason", trimmedReason);
      if (category) params.set("category", category);
      flashToast({
        title: t.withdrawal.withdrawalSuccessful,
        description: t.messages.success.withdrawalSuccess,
      });
      router.push(`/transfer/success?${params.toString()}`);
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, "withdrawalFailed"));
      void refresh();
    } finally {
      setLoading(false);
    }
  }

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

      <TextField
        label={t.withdrawal.amountIrr}
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        placeholder={localizeDigits("10000", language)}
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
        rightIcon={
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted">IRR</span>
            {status === "ready" && balance !== null ? (
              <button
                type="button"
                onClick={() => setAmount(String(Math.trunc(balance)))}
                className="text-xs font-bold text-primary hover:underline"
              >
                {t.withdrawal.maxWithdraw}
              </button>
            ) : null}
          </span>
        }
        className="pe-20 ltr:text-start"
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

      <TextField
        label={t.withdrawal.paymentReason}
        placeholder={t.withdrawal.paymentReasonPlaceholder}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {error && (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || status === "unauthenticated"}>
        {loading ? (
          <Spinner size="sm" label={t.withdrawal.processing} />
        ) : (
          t.withdrawal.withdrawBtn
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
