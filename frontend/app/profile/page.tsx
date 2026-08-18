'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { AppShell } from '@/shared/layout/AppShell';
import { HeaderBar } from '@/shared/layout/HeaderBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { api, getStoredToken, removeStoredToken } from '@/shared/api';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { WalletBalance } from '@/features/wallet/components/WalletBalance';
import { useWalletBalance } from '@/features/wallet/hooks/useWalletBalance';

type UserProfile = {
  id: string;
  email: string;
};

type WalletInfo = {
  id: string;
  currency: string;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { status, balance, currency, error, refresh } = useWalletBalance();

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [u, w] = await Promise.all([
        api.getMe().catch(() => null),
        api.getWallet().catch(() => null),
      ]);
      setUser(u);
      setWallet(w);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    removeStoredToken();
    setUser(null);
    setWallet(null);
    void refresh();
  }

  return (
    <AppShell>
      <HeaderBar title={t.profile.profileTitle} backHref="/" />

      <div className="flex-1 space-y-6 p-6 lg:p-8">
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-muted">
            {t.profile.loadingProfile}
          </div>
        ) : !user ? (
          <div className="space-y-4 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <User className="h-8 w-8" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {t.profile.notSignedIn}
            </h2>
            <p className="mx-auto max-w-[220px] text-xs text-muted">
              {t.profile.notSignedInSub}
            </p>
            <div className="mx-auto flex max-w-xs flex-col gap-2">
              <Link href="/login">
                <Button className="w-full">{t.common.signIn}</Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary" className="w-full">
                  {t.common.createAccount}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0 lg:max-w-4xl lg:mx-auto">
            <Card className="flex flex-col items-center justify-center space-y-4 p-8 text-center shadow-md">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-hero-gradient text-2xl font-extrabold text-primary-foreground shadow-md ring-4 ring-primary-soft">
                {user.email ? user.email.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {user.email}
                </h2>
                <p className="pt-0.5 font-mono text-xs font-medium text-muted">
                  {t.profile.userId}: {user.id}
                </p>
              </div>
              <div className="w-full pt-4">
                <Button variant="danger" onClick={handleLogout}>
                  {t.common.logOut}
                </Button>
              </div>
            </Card>

            {wallet && (
              <div className="flex flex-col justify-between space-y-6 rounded-3xl bg-hero-gradient p-8 text-primary-foreground shadow-lg">
                <WalletBalance
                  status={status}
                  balance={balance}
                  currency={currency || wallet.currency}
                  error={error}
                  onRetry={() => void refresh()}
                  variant="panel"
                  label={t.common.currentBalance}
                />
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-white/70">
                    {t.profile.walletId}
                  </p>
                  <p className="font-mono text-xs text-white/90">{wallet.id}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/20 pt-3">
                  <span className="text-xs text-white/60">
                    {t.profile.currencyLabel}
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    {wallet.currency}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
