"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";

function SuccessContent() {
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();

  const amount = searchParams.get("amount") || "0";
  const recipient = searchParams.get("recipient") || "";
  const email = searchParams.get("email") || "";
  const queryBalance = searchParams.get("balance");
  const queryCurrency = searchParams.get("currency") || "IRR";
  const formattedDate = formatDisplayDateTime(new Date(), language);

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar title={t.send.receipt} backHref="/" variant="hero" />

      <div className="flex flex-1 flex-col justify-between space-y-6 p-6 lg:mx-auto lg:w-full lg:max-w-md">
        <Card className="mt-2 space-y-6 p-6 text-foreground shadow-2xl">
          <div className="space-y-2 pt-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <h2 className="pt-2 text-lg font-bold text-foreground">
              {t.send.sendSuccessful}
            </h2>
            <p className="mx-auto max-w-[220px] text-xs font-medium leading-relaxed text-muted">
              {t.send.amountSent}
            </p>
          </div>

          <div className="space-y-4 border-b border-t border-border py-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>{t.send.transferAmount}</span>
              <span className="text-base font-extrabold text-foreground">
                {formatIrr(parseAmount(amount), queryCurrency)}
              </span>
            </div>

            <div className="rounded-2xl bg-surface-muted p-3">
              <WalletBalance
                status={status === "idle" ? "loading" : status}
                balance={
                  status === "ready" && balance !== null
                    ? balance
                    : parseAmount(queryBalance)
                }
                currency={status === "ready" ? currency : queryCurrency}
                error={error}
                onRetry={() => void refresh()}
                variant="heading"
                label={t.send.remainingBalance}
              />
            </div>

            <div className="space-y-1 rounded-2xl bg-surface-muted p-3 text-start">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted">
                {t.send.recipientLabel}
              </p>
              <p className="text-sm font-bold text-foreground">{recipient}</p>
              {email ? (
                <p className="text-xs font-medium text-muted">{email}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">{t.send.dateTime}</span>
            <span className="font-bold text-foreground">{formattedDate}</span>
          </div>
        </Card>

        <Link
          href="/"
          className="block w-full cursor-pointer rounded-2xl bg-primary py-4 text-center text-base font-bold text-primary-foreground shadow-xl shadow-primary/30 transition hover:bg-primary-hover active:scale-95 active:bg-primary-active"
        >
          {t.common.done}
        </Link>
      </div>
    </AppShell>
  );
}

export default function SendSuccessPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted">{t.common.loading}</div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
