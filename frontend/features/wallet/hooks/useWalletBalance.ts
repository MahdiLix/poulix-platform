'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getStoredToken } from '@/shared/api';
import { parseAmount } from '@/features/wallet/lib/wallet';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { localizeError } from '@/shared/i18n/localizeError';

export type WalletBalanceStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unauthenticated';

export function useWalletBalance() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<WalletBalanceStatus>('idle');
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('IRR');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      setStatus('unauthenticated');
      setBalance(null);
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const data = await api.getBalance();
      if (
        !data ||
        (typeof data.balance !== 'string' && typeof data.balance !== 'number')
      ) {
        throw new Error(t.messages.balanceResponseInvalid);
      }

      setBalance(parseAmount(data.balance));
      setCurrency(typeof data.currency === 'string' ? data.currency : 'IRR');
      setStatus('ready');
    } catch (err) {
      if (!getStoredToken()) {
        setStatus('unauthenticated');
        setBalance(null);
        setError(null);
        return;
      }

      setBalance(null);
      setError(localizeError(err, t.messages, 'failedToLoadBalance'));
      setStatus('error');
    }
  }, [t.messages]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, balance, currency, error, refresh };
}
