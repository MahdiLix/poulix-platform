"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Layers,
  PiggyBank,
  CalendarClock,
  Landmark,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Clock,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken, removeStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";

type UserProfile = {
  id: string;
  username?: string;
  email: string;
  role?: "USER" | "ADMIN";
  status?: string;
  createdAt?: string;
};

type WalletInfo = {
  id: string;
  currency: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { status, balance, currency, error, refresh } = useWalletBalance();

  const loadUserData = async () => {
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
  };

  useEffect(() => {
    void loadUserData();
  }, []);

  function handleLogout() {
    removeStoredToken();
    setUser(null);
    setWallet(null);
    void refresh();
    router.replace("/login");
  }

  return (
    <AppShell>
      <HeaderBar title={t.profile.profileTitle} backHref="/" />

      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-muted">
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
            <p className="mx-auto max-w-[240px] text-xs text-muted">
              {t.profile.notSignedInSub}
            </p>
            <div className="mx-auto flex max-w-xs flex-col gap-2 pt-2">
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
          <div className="space-y-6">
            {/* Top Identity Card */}
            <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm border border-border">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-hero-gradient text-2xl font-black text-primary-foreground shadow-md ring-4 ring-primary-soft">
                {user.username
                  ? user.username.substring(0, 2).toUpperCase()
                  : user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-start space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {user.username || user.email.split("@")[0]}
                  </h2>
                  {user.role === "ADMIN" ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      ADMIN
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
                    <ShieldCheck className="h-3 w-3" />
                    {user.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-muted font-medium">{user.email}</p>
                {user.createdAt ? (
                  <p className="text-[11px] text-muted flex items-center justify-center sm:justify-start gap-1 pt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{t.profile.memberSince}:</span>
                    <span>{formatDisplayDate(user.createdAt, language)}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={handleLogout}
                  className="gap-2 text-danger hover:bg-danger-soft hover:border-danger/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.common.logOut}</span>
                </Button>
              </div>
            </Card>

            {/* Wallet Overview Banner */}
            {wallet && (
              <div className="rounded-3xl bg-hero-gradient p-6 sm:p-8 text-primary-foreground shadow-lg flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="w-full sm:w-auto">
                  <WalletBalance
                    status={status}
                    balance={balance}
                    currency={currency || wallet.currency}
                    error={error}
                    onRetry={() => void refresh()}
                    variant="panel"
                    label={t.common.currentBalance}
                  />
                </div>
                <div className="w-full sm:w-auto flex sm:flex-col justify-between items-start sm:items-end gap-2 border-t sm:border-t-0 border-white/20 pt-4 sm:pt-0">
                  <div className="text-start sm:text-end">
                    <span className="text-[10px] tracking-wider uppercase text-white/70 block">
                      {t.profile.walletId}
                    </span>
                    <span className="font-mono text-xs text-white/90 font-medium">
                      {wallet.id}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] tracking-wider uppercase text-white/70 block">
                      {t.profile.currencyLabel}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {wallet.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Account Quick Navigation & Security Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/security">
                <Card className="p-5 flex items-center justify-between transition hover:border-primary/50 hover:shadow-md cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 group-hover:scale-105 transition-transform">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t.security.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {t.security.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
                </Card>
              </Link>

              <Link href="/destinations">
                <Card className="p-5 flex items-center justify-between transition hover:border-primary/50 hover:shadow-md cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 group-hover:scale-105 transition-transform">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t.destinations.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {t.destinations.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
                </Card>
              </Link>

              <Link href="/goals">
                <Card className="p-5 flex items-center justify-between transition hover:border-primary/50 hover:shadow-md cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t.goals.title}
                      </h3>
                      <p className="text-xs text-muted">{t.goals.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
                </Card>
              </Link>

              <Link href="/envelopes">
                <Card className="p-5 flex items-center justify-between transition hover:border-primary/50 hover:shadow-md cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 group-hover:scale-105 transition-transform">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t.envelopes.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {t.envelopes.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
                </Card>
              </Link>

              <Link href="/scheduled">
                <Card className="p-5 flex items-center justify-between transition hover:border-primary/50 hover:shadow-md cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t.scheduled.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {t.scheduled.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
                </Card>
              </Link>

              {user.role === "ADMIN" ? (
                <Link href="/admin">
                  <Card className="p-5 flex items-center justify-between border-primary/40 bg-primary-soft/30 transition hover:border-primary hover:shadow-md cursor-pointer group">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground group-hover:scale-105 transition-transform">
                        <ExternalLink className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-primary">
                          {t.admin.title}
                        </h3>
                        <p className="text-xs text-muted">{t.admin.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </Card>
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
