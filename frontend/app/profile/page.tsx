"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Keyboard,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useUser } from "@/shared/user/UserProvider";
import { PageSpinner } from "@/shared/ui/Spinner";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import {
  isVirtualKeyboardEnabled,
  setVirtualKeyboardEnabled,
} from "@/shared/preferences/virtualKeyboard";

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
  const { t, language } = useLanguage();
  const { signOut } = useUser();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [virtualKeyboard, setVirtualKeyboard] = useState(false);
  const { balance, currency, refresh } = useWalletBalance();

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
    setVirtualKeyboard(isVirtualKeyboardEnabled());
  }, []);

  function handleLogout() {
    signOut();
    void refresh();
  }

  const settingsLinks = [
    {
      href: "/security",
      icon: Shield,
      title: t.security.title,
      description: t.security.subtitle,
    },
    {
      href: "/destinations",
      icon: Landmark,
      title: t.destinations.title,
      description: t.destinations.subtitle,
    },
    {
      href: "/goals",
      icon: PiggyBank,
      title: t.goals.title,
      description: t.goals.subtitle,
    },
    {
      href: "/envelopes",
      icon: Layers,
      title: t.envelopes.title,
      description: t.envelopes.subtitle,
    },
    {
      href: "/scheduled",
      icon: CalendarClock,
      title: t.scheduled.title,
      description: t.scheduled.subtitle,
    },
  ];

  return (
    <AppShell showTopBar={false}>
      <HeaderBar title={t.profile.profileTitle} backHref="/" />

      <div className="mx-auto max-w-4xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        {loading ? (
          <PageSpinner label={t.profile.loadingProfile} />
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
            <Card className="flex flex-col items-center gap-6 border border-border p-6 shadow-sm sm:flex-row sm:p-7">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-hero-gradient text-xl font-black text-primary-foreground shadow-md ring-4 ring-primary-soft sm:text-2xl">
                {user.username
                  ? user.username.substring(0, 2).toUpperCase()
                  : user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-start">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-lg font-bold text-foreground">
                    {user.username || user.email.split("@")[0]}
                  </h2>
                  {user.role === "ADMIN" ? (
                    <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-bold text-background">
                      ADMIN
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-success">
                    <ShieldCheck className="h-3 w-3" />
                    {user.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs font-medium text-muted">{user.email}</p>
                {user.createdAt ? (
                  <p className="flex items-center justify-center gap-1 pt-0.5 text-[11px] text-muted sm:justify-start">
                    <Clock className="h-3 w-3" />
                    <span>{t.profile.memberSince}:</span>
                    <span>{formatDisplayDate(user.createdAt, language)}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="danger"
                  onClick={handleLogout}
                  className="w-auto gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.common.logOut}</span>
                </Button>
              </div>
            </Card>

            {wallet ? (
              <div className="flex flex-col items-start justify-between gap-6 rounded-[14px] bg-ink-hero p-6 text-primary-foreground sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-white/70 uppercase">
                    {t.common.currentBalance}
                  </p>
                  <p className="amount mt-1 text-2xl font-bold lg:text-3xl">
                    {formatIrr(balance ?? 0, "", language).trim()}{" "}
                    <span className="text-secondary">
                      {currency || wallet.currency}
                    </span>
                  </p>
                </div>
                <div className="flex w-full items-start justify-between gap-8 sm:w-auto sm:justify-end">
                  <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                      {t.profile.walletId}
                    </span>
                    <span className="font-mono text-xs font-medium text-white/90">
                      {wallet.id}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                      {t.profile.currencyLabel}
                    </span>
                    <span className="text-xs font-bold text-white/90">
                      {wallet.currency}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                {t.home.preferences}
              </h3>
              <Card className="divide-y divide-border overflow-hidden p-0">
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      EN / FA
                    </p>
                    <p className="text-xs text-muted">
                      {language === "fa" ? "زبان رابط" : "Interface language"}
                    </p>
                  </div>
                  <LanguageToggle variant="compact" />
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {language === "fa"
                        ? "حالت تیره / روشن"
                        : "Dark / Light Mode"}
                    </p>
                    <p className="text-xs text-muted">
                      {language === "fa" ? "ظاهر برنامه" : "Appearance"}
                    </p>
                  </div>
                  <ThemeToggle variant="compact" />
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Keyboard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t.profile.virtualKeyboard}
                      </p>
                      <p className="text-xs text-muted">
                        {t.profile.virtualKeyboardHint}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={virtualKeyboard}
                    onClick={() => {
                      const next = !virtualKeyboard;
                      setVirtualKeyboard(next);
                      setVirtualKeyboardEnabled(next);
                    }}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${
                      virtualKeyboard ? "bg-primary" : "bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                        virtualKeyboard ? "end-0.5" : "start-0.5"
                      }`}
                    />
                  </button>
                </div>
              </Card>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                {t.nav.account}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {settingsLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Card className="group flex cursor-pointer items-center justify-between p-4 transition hover:border-primary/50 hover:shadow-md">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground">
                              {item.title}
                            </h4>
                            <p className="text-xs text-muted">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted transition-colors group-hover:text-primary rtl:rotate-180" />
                      </Card>
                    </Link>
                  );
                })}

                {user.role === "ADMIN" ? (
                  <Link href="/admin">
                    <Card className="group flex cursor-pointer items-center justify-between border-primary/40 bg-primary-soft/30 p-4 transition hover:border-primary hover:shadow-md">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                          <ExternalLink className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-primary">
                            {t.admin.title}
                          </h4>
                          <p className="text-xs text-muted">
                            {t.admin.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary rtl:rotate-180" />
                    </Card>
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
