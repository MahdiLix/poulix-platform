'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { formatIrr } from '@/features/wallet/lib/wallet';
import type { WalletBalanceStatus } from '@/features/wallet/hooks/useWalletBalance';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { cn } from '@/shared/cn';

type WalletBalanceProps = {
  status: WalletBalanceStatus;
  balance: number | null;
  currency?: string;
  error?: string | null;
  onRetry?: () => void;
  variant?: 'hero' | 'heading' | 'panel';
  label?: string;
};

export function WalletBalance({
  status,
  balance,
  currency = 'IRR',
  error,
  onRetry,
  variant = 'heading',
  label,
}: WalletBalanceProps) {
  const { t } = useLanguage();
  const defaultLabel =
    variant === 'hero' || variant === 'heading'
      ? t.common.availableBalance
      : t.common.currentBalance;
  const displayLabel = label || defaultLabel;

  const muted = variant === 'hero' ? 'text-white/70' : 'text-muted';
  const strong =
    variant === 'hero' ? 'text-primary-foreground' : 'text-foreground';

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="space-y-1 text-center">
        {variant !== 'panel' && (
          <p className={cn('text-xs font-medium tracking-wide', muted)}>
            {displayLabel}
          </p>
        )}
        <p className={cn('text-xs font-semibold', muted)}>
          {t.common.loadingBalance}
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="space-y-3 text-center">
        {variant !== 'panel' && (
          <p className={cn('text-xs font-medium tracking-wide', muted)}>
            {displayLabel}
          </p>
        )}
        <p className={cn('text-sm font-semibold', strong)}>
          {t.common.signInToViewBalance}
        </p>
        <p className={cn('mx-auto max-w-[240px] text-xs', muted)}>
          {t.common.walletPrivateMsg}
        </p>
        <div className="mx-auto flex max-w-xs flex-col gap-2">
          <Link href="/login">
            <Button className="w-full">{t.common.signIn}</Button>
          </Link>
          <Link href="/register">
            <Button
              variant={variant === 'hero' ? 'ghost' : 'secondary'}
              className="w-full"
            >
              {t.common.createAccount}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-3 text-center">
        {variant !== 'panel' && (
          <p className={cn('text-xs font-medium tracking-wide', muted)}>
            {displayLabel}
          </p>
        )}
        <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
          {error || t.common.couldNotLoadBalance}
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            className="mx-auto max-w-xs"
          >
            {t.common.retry}
          </Button>
        )}
      </div>
    );
  }

  const amountClass =
    variant === 'hero'
      ? 'text-4xl font-extrabold tracking-tight'
      : variant === 'panel'
        ? 'text-xl font-extrabold tracking-tight'
        : 'text-3xl font-extrabold tracking-tight text-foreground';

  return (
    <div
      className={cn(
        'space-y-1',
        variant === 'panel' ? 'text-start' : 'text-center',
      )}
    >
      <p
        className={cn(
          'text-xs font-medium tracking-wide',
          variant === 'hero'
            ? 'text-white/70'
            : variant === 'panel'
              ? 'text-white/70'
              : 'text-muted',
          variant === 'heading' && 'font-semibold tracking-wider uppercase',
        )}
      >
        {displayLabel}
      </p>
      <p className={amountClass}>{formatIrr(balance ?? 0, currency)}</p>
    </div>
  );
}
