"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  Landmark,
  MessageSquare,
  Share2,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatMessage } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { readWithdrawalReceipt } from "@/features/wallet/lib/receipt";

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="min-w-0 flex-1 text-xs text-muted">{label}</p>
      <p
        className={`text-sm font-semibold ${valueClassName ?? "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SuccessContent() {
  const { t, language } = useLanguage();
  const receipt = readWithdrawalReceipt();
  const amount = receipt?.amount ?? 0;
  const destinationType = receipt?.destinationType ?? "account";
  const destination = receipt?.destination ?? "";
  const queryBalance = receipt?.balance ?? 0;
  const queryCurrency = receipt?.currency ?? "IRR";
  const reason = receipt?.reason ?? "";
  const { status, balance, currency } = useWalletBalance();

  const destinationLabel =
    destinationType === "shaba"
      ? t.withdrawal.shabaNumber
      : t.withdrawal.accountNumber;
  const formattedDate = formatDisplayDateTime(new Date(), language);
  const remaining =
    status === "ready" && balance !== null
      ? balance
      : parseAmount(queryBalance);
  const remainingCurrency = status === "ready" ? currency : queryCurrency;
  const masked =
    destination.length > 8
      ? `${destination.slice(0, 4)}****${destination.slice(-4)}`
      : destination;

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.withdrawal.receipt}
        backHref="/"
        trailing={
          <button
            type="button"
            onClick={() => {
              const amountLabel = formatIrr(parseAmount(amount), queryCurrency);
              if (navigator.share) {
                void navigator.share({
                  title: t.messages.shareReceiptTitle,
                  text: formatMessage(t.messages.shareReceiptText, {
                    amount: amountLabel,
                    destinationLabel,
                    destination,
                  }),
                });
              } else {
                alert(
                  formatMessage(t.messages.withdrewAmount, {
                    amount: amountLabel,
                  }),
                );
              }
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-surface text-foreground transition hover:bg-surface-muted active:scale-95"
          >
            <Share2 className="h-5 w-5" />
          </button>
        }
      />

      <div className="mx-auto flex w-full flex-1 flex-col justify-center p-4 lg:max-w-md lg:p-6">
        <Card className="space-y-5 p-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-5 w-5" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {t.withdrawal.withdrawalSuccessful}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.withdrawal.amountDeducted}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[14px] border border-border p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.withdrawal.destination}
              </p>
              <p className="truncate font-mono text-xs font-bold">{masked}</p>
            </div>
            <p className="amount shrink-0 text-base font-extrabold">
              {formatIrr(parseAmount(amount), queryCurrency)}
            </p>
          </div>

          <div>
            <DetailRow
              icon={Wallet}
              label={t.withdrawal.paymentMethod}
              value={destinationLabel}
            />
            <DetailRow
              icon={Wallet}
              label={t.withdrawal.remainingBalance}
              value={formatIrr(remaining, remainingCurrency)}
            />
            <DetailRow
              icon={Calendar}
              label={t.withdrawal.dateTime}
              value={formattedDate}
            />
            <DetailRow
              icon={CheckCircle2}
              label={t.withdrawal.status}
              value={t.withdrawal.completed}
              valueClassName="text-primary"
            />
            {reason ? (
              <DetailRow
                icon={MessageSquare}
                label={t.withdrawal.paymentReason}
                value={reason}
              />
            ) : null}
          </div>

          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full">{t.send.doneBackToWallet}</Button>
            </Link>
            <Link href="/history" className="block">
              <Button variant="secondary" className="w-full">
                {t.withdrawal.seeDetail}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default function ReceiptSuccessPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<PageSpinner label={t.common.loading} />}>
      <SuccessContent />
    </Suspense>
  );
}
