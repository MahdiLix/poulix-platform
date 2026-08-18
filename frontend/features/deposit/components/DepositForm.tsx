'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { getStoredToken } from '@/shared/api';
import { formatIrr } from '@/features/wallet/lib/wallet';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { localizeError } from '@/shared/i18n/localizeError';
import {
  DEPOSIT_PRESETS,
  depositRedirectHint,
  startZarinpalDeposit,
  validateDepositAmount,
} from '@/features/deposit/lib/deposit';

type DepositFormProps = {
  initialAmount?: string;
};

export function DepositForm({ initialAmount = '100000' }: DepositFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleDeposit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    const validationError = validateDepositAmount(amount, t.messages);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!getStoredToken()) {
      setError(t.messages.pleaseSignInToDeposit);
      router.push('/login');
      return;
    }

    const numericAmount = Number(amount);
    setLoading(true);
    setInfo(depositRedirectHint(numericAmount, t.messages));

    try {
      await startZarinpalDeposit(numericAmount, t.messages);
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, 'depositFailedGeneric'));
      setInfo('');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleDeposit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-xl bg-primary-soft p-3 text-center text-xs font-semibold text-primary">
          {info}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-muted">
          {t.deposit.topUpAmount}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          required
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
            setInfo('');
          }}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-2xl font-extrabold text-foreground transition hover:border-primary/40 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DEPOSIT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(String(preset));
              setError('');
              setInfo('');
            }}
            className={`rounded-xl border px-1 py-2.5 text-[11px] font-bold leading-tight transition cursor-pointer hover:border-primary/40 active:scale-95 ${
              Number(amount) === preset
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface-muted text-muted hover:bg-border'
            }`}
          >
            {formatIrr(preset)}
          </button>
        ))}
      </div>

      <Button type="submit" disabled={loading} className="mt-4">
        {loading ? t.deposit.redirecting : t.deposit.payWithZarinpal}
      </Button>
    </form>
  );
}
