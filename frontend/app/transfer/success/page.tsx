'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronDown, Share2 } from 'lucide-react';
import { AppShell } from '@/shared/layout/AppShell';
import { HeaderBar } from '@/shared/layout/HeaderBar';
import { Card } from '@/shared/ui/Card';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { formatDisplayDateTime } from '@/shared/i18n/dates';
import { formatMessage } from '@/shared/i18n/localizeError';
import { formatIrr, parseAmount } from '@/features/wallet/lib/wallet';
import { WalletBalance } from '@/features/wallet/components/WalletBalance';
import { useWalletBalance } from '@/features/wallet/hooks/useWalletBalance';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();

  const amount = searchParams.get('amount') || '0';
  const destinationType = searchParams.get('type') || 'account';
  const destination =
    searchParams.get('destination') ||
    searchParams.get('acc') ||
    searchParams.get('name') ||
    '';
  const queryBalance = searchParams.get('balance');
  const queryCurrency = searchParams.get('currency') || 'IRR';
  const { status, balance, currency, error, refresh } = useWalletBalance();

  const [showDetail, setShowDetail] = useState(false);
  const destinationLabel =
    destinationType === 'shaba'
      ? t.withdrawal.shabaNumber
      : t.withdrawal.accountNumber;

  const formattedDate = formatDisplayDateTime(new Date(), language);

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.withdrawal.receipt}
        backHref="/"
        variant="hero"
        trailing={
          <button
            onClick={() => {
              const amountLabel = formatIrr(
                parseAmount(amount),
                queryCurrency,
              );
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
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-primary-foreground transition hover:bg-white/20 active:scale-95"
          >
            <Share2 className="h-5 w-5" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col justify-between space-y-6 p-6 lg:mx-auto lg:w-full lg:max-w-md">
        <Card className="mt-2 space-y-6 p-6 text-foreground shadow-2xl">
          <div className="space-y-2 pt-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <h2 className="pt-2 text-lg font-bold text-foreground">
              {t.withdrawal.withdrawalSuccessful}
            </h2>
            <p className="mx-auto max-w-[220px] text-xs leading-relaxed font-medium text-muted">
              {t.withdrawal.amountDeducted}
            </p>
          </div>

          <div className="space-y-4 border-b border-t border-border py-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>{t.withdrawal.withdrawalAmount}</span>
              <span className="text-base font-extrabold text-foreground">
                {formatIrr(parseAmount(amount), queryCurrency)}
              </span>
            </div>

            <div className="rounded-2xl bg-surface-muted p-3">
              <WalletBalance
                status={status === 'idle' ? 'loading' : status}
                balance={
                  status === 'ready' && balance !== null
                    ? balance
                    : parseAmount(queryBalance)
                }
                currency={status === 'ready' ? currency : queryCurrency}
                error={error}
                onRetry={() => void refresh()}
                variant="heading"
                label={t.withdrawal.remainingBalance}
              />
            </div>

            <div className="space-y-1 rounded-2xl bg-surface-muted p-3 text-start">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted">
                {destinationLabel}
              </p>
              <p className="font-mono text-xs font-bold break-all text-foreground">
                {destination}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted">
                {t.withdrawal.dateTime}
              </span>
              <span className="font-bold text-foreground">{formattedDate}</span>
            </div>

            <div className="border-t border-border pt-2">
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="flex w-full cursor-pointer items-center justify-between font-bold text-foreground transition hover:text-primary active:opacity-80"
              >
                <span>{t.withdrawal.seeDetail}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showDetail ? 'rotate-180' : ''}`}
                />
              </button>

              {showDetail && (
                <div className="mt-3 space-y-2 border-t border-border pt-3 text-[11px] text-muted">
                  <div className="flex justify-between">
                    <span>{t.withdrawal.paymentMethod}</span>
                    <span className="font-semibold text-foreground">
                      {t.withdrawal.walletBalance}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.withdrawal.destination}</span>
                    <span className="font-semibold text-foreground">
                      {destinationLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.withdrawal.status}</span>
                    <span className="font-semibold text-success">
                      {t.withdrawal.completed}
                    </span>
                  </div>
                </div>
              )}
            </div>
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

export default function ReceiptSuccessPage() {
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
