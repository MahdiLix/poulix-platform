"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Check,
  CheckCircle2,
  MessageSquare,
  Tag,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import {
  isTransactionCategory,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";

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
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { status, balance, currency } = useWalletBalance();

  const amount = searchParams.get("amount") || "0";
  const recipient = searchParams.get("recipient") || "";
  const email = searchParams.get("email") || "";
  const queryBalance = searchParams.get("balance");
  const queryCurrency = searchParams.get("currency") || "IRR";
  const reason = searchParams.get("reason") || "";
  const category = searchParams.get("category") || "";
  const formattedDate = formatDisplayDateTime(new Date(), language);
  const remaining =
    status === "ready" && balance !== null
      ? balance
      : parseAmount(queryBalance);
  const remainingCurrency = status === "ready" ? currency : queryCurrency;
  const categoryLabel = isTransactionCategory(category)
    ? t.history.categories[category as TransactionCategory]
    : category;
  const initial = recipient.slice(0, 1).toUpperCase() || "P";

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.send.receipt} backHref="/" />

      <div className="mx-auto flex w-full flex-1 flex-col justify-center p-4 lg:max-w-md lg:p-6">
        <Card className="space-y-5 p-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-5 w-5" strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {t.send.sendSuccessful}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.send.amountSent}
            </p>
          </div>

          <div className="flex items-center gap-3 border-b border-t border-border py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{recipient}</p>
              {email ? (
                <p className="truncate text-xs text-muted">{email}</p>
              ) : null}
            </div>
            <p className="amount shrink-0 text-base font-extrabold">
              {formatIrr(parseAmount(amount), queryCurrency)}
            </p>
          </div>

          <div>
            <DetailRow
              icon={Wallet}
              label={t.send.transferAmount}
              value={formatIrr(parseAmount(amount), queryCurrency)}
            />
            <DetailRow
              icon={Wallet}
              label={t.send.remainingBalance}
              value={formatIrr(remaining, remainingCurrency)}
            />
            <DetailRow
              icon={Calendar}
              label={t.send.dateTime}
              value={formattedDate}
            />
            <DetailRow
              icon={CheckCircle2}
              label={t.send.statusLabel}
              value={t.send.completed}
              valueClassName="text-primary"
            />
            {reason ? (
              <DetailRow
                icon={MessageSquare}
                label={t.send.reasonLabel}
                value={reason}
              />
            ) : null}
            {categoryLabel ? (
              <DetailRow
                icon={Tag}
                label={t.send.categoryLabel}
                value={categoryLabel}
              />
            ) : null}
          </div>

          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full">{t.send.doneBackToWallet}</Button>
            </Link>
            <Link href="/history" className="block">
              <Button variant="secondary" className="w-full">
                {t.send.seeDetail}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default function SendSuccessPage() {
  const { t } = useLanguage();

  return (
    <Suspense fallback={<PageSpinner label={t.common.loading} />}>
      <SuccessContent />
    </Suspense>
  );
}
