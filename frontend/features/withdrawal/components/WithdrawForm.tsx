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
  type WithdrawDestination,
} from "@/features/withdrawal/lib/withdraw";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";

export function WithdrawForm() {
  const router = useRouter();
  const { t } = useLanguage();
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
  const [savedDestinations, setSavedDestinations] = useState<
    import("@/features/financial-destinations/lib/destinations").FinancialDestination[]
  >([]);
  const [recentDestinations, setRecentDestinations] = useState<
    import("@/features/financial-destinations/lib/destinations").FinancialDestination[]
  >([]);

  useEffect(() => {
    setAccountNumber(getSavedAccountNumber());
    setShabaNumber(getSavedShabaNumber());
    if (getStoredToken()) {
      void Promise.all([
        api.getSavedDestinations().catch(() => []),
        api.getRecentDestinations().catch(() => []),
      ]).then(([savedList, recentList]) => {
        setSavedDestinations(savedList);
        setRecentDestinations(recentList);
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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setDestination("account");
            setFieldError(null);
            setError("");
          }}
          className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer hover:border-primary/40 active:scale-95 ${
            destination === "account"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface-muted text-muted hover:bg-border"
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
          className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer hover:border-primary/40 active:scale-95 ${
            destination === "shaba"
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface-muted text-muted hover:bg-border"
          }`}
        >
          {t.withdrawal.shabaNumber}
        </button>
      </div>

      {(() => {
        const currentType =
          destination === "account" ? "BANK_ACCOUNT" : "SHABA";
        const allMatching = [
          ...savedDestinations.filter((d) => d.type === currentType),
          ...recentDestinations.filter(
            (d) =>
              d.type === currentType &&
              !savedDestinations.some((s) => s.id === d.id),
          ),
        ];

        if (allMatching.length === 0) return null;

        return (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted">
              {destination === "account"
                ? t.destinations.accountNumber
                : t.destinations.shabaNumber}
              :
            </span>
            <div className="flex flex-wrap gap-2">
              {allMatching.map((item) => {
                const masked = item.maskedValue;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      void api.getDestinationValue(item.id).then((value) => {
                        if (value.type === "BANK_ACCOUNT") {
                          setAccountNumber(value.accountNumber);
                          saveAccountNumber(value.accountNumber);
                        } else if (value.type === "SHABA") {
                          setShabaNumber(value.shabaNumber);
                          saveShabaNumber(value.shabaNumber);
                        }
                        setFieldError(null);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary-soft hover:text-primary active:scale-95 cursor-pointer"
                  >
                    <span>{item.label}</span>
                    {masked ? (
                      <span className="font-mono text-[10px] text-muted">
                        ({masked})
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {destination === "account" ? (
        <TextField
          label={t.withdrawal.accountNumber}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t.withdrawal.accountNumberPlaceholder}
          value={accountNumber}
          error={fieldError}
          onChange={(e) => {
            const next = e.target.value;
            setAccountNumber(next);
            setFieldError(null);
            saveAccountNumber(next);
          }}
        />
      ) : (
        <TextField
          label={t.withdrawal.shabaNumber}
          autoComplete="off"
          placeholder={t.withdrawal.shabaNumberPlaceholder}
          value={shabaNumber}
          error={fieldError}
          onChange={(e) => {
            const next = e.target.value;
            setShabaNumber(next);
            setFieldError(null);
            saveShabaNumber(next);
          }}
        />
      )}

      <TextField
        label={t.withdrawal.amountIrr}
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

      {error && (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || status === "unauthenticated"}>
        {loading ? t.withdrawal.processing : t.withdrawal.withdrawBtn}
      </Button>

      {status === "ready" && balance !== null && (
        <p className="text-center text-[11px] font-medium text-muted">
          {t.withdrawal.maxWithdraw.replace(
            "{max}",
            formatIrr(balance, currency),
          )}
        </p>
      )}
    </form>
  );
}
