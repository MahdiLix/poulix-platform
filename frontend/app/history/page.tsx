'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, FileText } from 'lucide-react';
import { AppShell } from '@/shared/layout/AppShell';
import { HeaderBar } from '@/shared/layout/HeaderBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { api, getStoredToken } from '@/shared/api';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { formatDisplayDate } from '@/shared/i18n/dates';
import { localizeError } from '@/shared/i18n/localizeError';
import { formatIrr, parseAmount } from '@/features/wallet/lib/wallet';

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  createdAt: string;
};

type HistoryStatus = 'loading' | 'ready' | 'unauthenticated' | 'error';

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    const token = getStoredToken();
    if (!token) {
      setTransactions([]);
      setError(null);
      setStatus('unauthenticated');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const data = await api.getTransactions();
      if (!Array.isArray(data)) {
        throw new Error(t.messages.historyResponseInvalid);
      }
      setTransactions(data);
      setStatus('ready');
    } catch (err) {
      if (!getStoredToken()) {
        setTransactions([]);
        setError(null);
        setStatus('unauthenticated');
        return;
      }

      setTransactions([]);
      setError(localizeError(err, t.messages, 'failedToLoadHistory'));
      setStatus('error');
    }
  }

  return (
    <AppShell>
      <HeaderBar title={t.history.historyTitle} backHref="/" />

      <div className="flex-1 space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-4xl lg:p-8">
        {status === 'loading' ? (
          <div className="py-12 text-center text-xs font-semibold text-muted">
            {t.history.loadingHistory}
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="space-y-4 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {t.history.signInToViewHistory}
            </p>
            <p className="mx-auto max-w-[220px] text-xs text-muted">
              {t.history.historyPrivateMsg}
            </p>
            <div className="mx-auto flex max-w-xs flex-col gap-2">
              <Link href="/login" className="cursor-pointer">
                <Button className="w-full">{t.common.signIn}</Button>
              </Link>
              <Link href="/register" className="cursor-pointer">
                <Button variant="secondary" className="w-full">
                  {t.common.createAccount}
                </Button>
              </Link>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="space-y-3 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
              {error || t.messages.couldNotLoadTransactions}
            </div>
            <Button variant="secondary" onClick={() => void loadHistory()}>
              {t.common.retry}
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="space-y-3 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {t.history.noTransactionsYet}
            </p>
            <p className="mx-auto max-w-[200px] text-xs text-muted">
              {t.history.noTransactionsSub}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isDeposit = tx.type === 'DEPOSIT';
              const formattedDate = formatDisplayDate(tx.createdAt, language);

              return (
                <Card
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        isDeposit
                          ? 'bg-success-soft text-success'
                          : 'bg-primary-soft text-primary'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDown className="h-5 w-5" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground lg:text-sm">
                        {isDeposit ? t.history.deposit : t.history.withdrawal}
                      </h3>
                      <p className="text-[11px] font-medium text-muted">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-extrabold lg:text-base ${
                      isDeposit ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {isDeposit ? '+' : '-'}
                    {formatIrr(parseAmount(tx.amount))}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
