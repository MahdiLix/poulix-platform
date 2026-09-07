"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Spinner } from "@/shared/ui/Spinner";
import { AmountField } from "@/shared/ui/AmountField";
import { getStoredToken } from "@/shared/api";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { flashToast } from "@/shared/ui/Toast";
import {
  DEPOSIT_PRESETS,
  startZarinpalDeposit,
  validateDepositAmount,
} from "@/features/deposit/lib/deposit";
import {
  applyOfferPercent,
  consumeActiveOffer,
  getActiveOffer,
  type ActiveOffer,
} from "@/features/offers/lib/offers";

type DepositFormProps = {
  initialAmount?: string;
};

function formatPreset(amount: number): string {
  if (amount >= 1_000_000) {
    return `${amount / 1_000_000}M`;
  }
  if (amount >= 1_000) {
    return `${amount / 1_000}k`;
  }
  return String(amount);
}

export function DepositForm({ initialAmount = "100000" }: DepositFormProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { balance, status: balanceStatus, currency } = useWalletBalance();
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeOffer, setActiveOffer] = useState<ActiveOffer | null>(null);

  useEffect(() => {
    setActiveOffer(getActiveOffer());
  }, []);

  async function handleDeposit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validateDepositAmount(amount, t.messages);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!getStoredToken()) {
      setError(t.messages.pleaseSignInToDeposit);
      router.push("/login");
      return;
    }

    const numericAmount = Number(amount);
    setLoading(true);
    flashToast({
      title: t.deposit.redirecting,
      variant: "info",
    });

    try {
      if (activeOffer) consumeActiveOffer();
      await startZarinpalDeposit(numericAmount, t.messages);
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, "depositFailedGeneric"));
      setLoading(false);
    }
  }

  const numericAmount = Number(amount) || 0;
  const currentBalance = balance ?? 0;
  const bonus = activeOffer
    ? applyOfferPercent(numericAmount, activeOffer.percent)
    : 0;
  const afterBalance = currentBalance + numericAmount + bonus;

  function balanceLabel(): string {
    if (balanceStatus === "loading" || balanceStatus === "idle") {
      return t.common.loadingBalance;
    }
    if (balanceStatus === "unauthenticated" || balance === null) {
      return t.common.signInToViewBalance;
    }
    if (balanceStatus === "error") {
      return t.common.couldNotLoadBalance;
    }
    return formatIrr(currentBalance, currency, language);
  }

  function afterBalanceLabel(): string {
    if (balanceStatus === "ready" && balance !== null) {
      return formatIrr(afterBalance, currency, language);
    }
    return "-";
  }

  return (
    <form onSubmit={handleDeposit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {activeOffer ? (
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs">
          <p className="font-bold text-foreground">{activeOffer.title}</p>
          <p className="mt-1 text-muted">{activeOffer.description}</p>
          {bonus > 0 ? (
            <p className="mt-2 font-semibold text-secondary">
              +{formatIrr(bonus, currency, language)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Badge
          variant="warning"
          className="gap-1.5 rounded-md px-2.5 py-1 text-[11px]"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
            Z
          </span>
          ZarinPal - Sandbox
        </Badge>
      </div>

      <AmountField
        label={t.deposit.topUpAmount}
        autoFocus
        enterKeyHint="done"
        required
        placeholder="100000"
        value={amount}
        className="h-16 rounded-2xl pe-16 text-2xl font-extrabold"
        onChange={(event) => {
          setAmount(event.target.value);
          setError("");
        }}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted">Preset amounts</p>
        <div className="grid grid-cols-3 gap-2">
          {DEPOSIT_PRESETS.map((preset) => {
            const selected = Number(amount) === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                className={`flex flex-col items-center justify-center rounded-xl border px-1 py-3 transition cursor-pointer hover:border-primary/40 active:scale-95 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-muted text-foreground hover:bg-surface"
                }`}
              >
                <span className="text-xs font-bold">
                  {formatPreset(preset)}
                </span>
                <span className="text-[10px] opacity-70">IRR</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="mb-3 text-xs font-semibold text-muted">Balance preview</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted">{t.common.currentBalance}</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {balanceLabel()}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="flex-1 text-end">
            <p className="text-xs text-muted">After top-up</p>
            <p className="mt-1 text-sm font-bold text-secondary">
              {afterBalanceLabel()}
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} size="lg" className="h-12 text-base">
        {loading ? (
          <Spinner size="sm" label={t.deposit.redirecting} />
        ) : (
          t.deposit.payWithZarinpal
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="text-center">
          Wallet is credited only after ZarinPal verifies the payment. Duplicate
          callbacks are ignored.
        </span>
      </div>
    </form>
  );
}
