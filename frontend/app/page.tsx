"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  CalendarClock,
  FileText,
  Layers,
  Landmark,
  PiggyBank,
  Plus,
  Send,
  Shield,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { DepositModal } from "@/features/deposit/components/DepositModal";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role?: "USER" | "ADMIN";
  } | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const loadUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      router.replace("/login");
      return;
    }

    try {
      const userRes = await api.getMe();
      setUser(userRes);
    } catch {
      if (!getStoredToken()) {
        setUser(null);
        router.replace("/login");
      }
    }
  };

  useEffect(() => {
    void loadUser();
  }, []);

  const paymentServices = [
    {
      label: t.withdrawal.withdrawTitle,
      href: "/transfer",
      icon: ArrowDownLeft,
      color:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    {
      label: t.scheduled.title,
      href: "/scheduled",
      icon: CalendarClock,
      color:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    },
    {
      label: t.goals.title,
      href: "/goals",
      icon: PiggyBank,
      color:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    },
    {
      label: t.envelopes.title,
      href: "/envelopes",
      icon: Layers,
      color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
    },
    {
      label: t.destinations.title,
      href: "/destinations",
      icon: Landmark,
      color: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
    },
    {
      label: t.security.title,
      href: "/security",
      icon: Shield,
      color: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
    },
  ];

  return (
    <AppShell>
      <div className="relative rounded-b-[36px] bg-hero-gradient px-6 pb-16 pt-8 text-primary-foreground shadow-lg lg:rounded-b-none lg:rounded-t-3xl lg:px-10 lg:pb-20 lg:pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={user ? "/profile" : "/login"}
              className="relative overflow-hidden rounded-full p-0.5 ring-2 ring-white/30 transition hover:ring-white/70 active:scale-95 cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {user?.email ? user.email.substring(0, 2).toUpperCase() : "U"}
              </div>
            </Link>
            <div className="max-[460px]:hidden">
              <p className="text-xs font-medium text-white/70">
                {t.common.welcomeBack}
              </p>
              <Link
                href={user ? "/profile" : "/login"}
                className="flex items-center text-sm font-semibold text-white hover:underline active:opacity-80 cursor-pointer"
              >
                {user ? user.email.split("@")[0] : t.common.guestUser}
                <span className="ms-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {user ? t.common.loggedIn : t.common.signIn}
                </span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle className="bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30 cursor-pointer" />
            <ThemeToggle className="bg-white/10 text-primary-foreground hover:bg-white/20 active:bg-white/30 cursor-pointer" />
            <NotificationBell />
          </div>
        </div>

        <WalletBalance
          status={status}
          balance={balance}
          currency={currency}
          error={error}
          onRetry={() => void refresh()}
          variant="hero"
          label={t.common.availableBalance}
        />
      </div>

      <div className="z-10 -mt-10 px-6 lg:-mt-12">
        <Card className="grid grid-cols-4 gap-2 rounded-2xl p-4 shadow-xl lg:mx-auto lg:max-w-3xl lg:gap-6 lg:p-6">
          <button
            onClick={() => {
              if (!getStoredToken()) {
                router.push("/login");
              } else {
                setIsDepositOpen(true);
              }
            }}
            className="group flex cursor-pointer flex-col items-center rounded-xl p-1 transition hover:bg-surface-muted active:scale-95"
          >
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary transition group-hover:bg-secondary-soft lg:h-14 lg:w-14">
              <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <span className="text-xs font-semibold text-foreground lg:text-sm">
              {t.home.topUp}
            </span>
          </button>

          <Link
            href="/send"
            className="group flex cursor-pointer flex-col items-center rounded-xl p-1 transition hover:bg-surface-muted active:scale-95"
          >
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary transition group-hover:bg-secondary-soft lg:h-14 lg:w-14">
              <Send className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <span className="text-xs font-semibold text-foreground lg:text-sm">
              {t.home.send}
            </span>
          </Link>

          <button
            onClick={() => {
              if (!getStoredToken()) {
                router.push("/login");
              } else {
                alert(t.home.requestMoneyAlert);
              }
            }}
            className="group flex cursor-pointer flex-col items-center rounded-xl p-1 transition hover:bg-surface-muted active:scale-95"
          >
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary transition group-hover:bg-secondary-soft lg:h-14 lg:w-14">
              <ArrowDownLeft className="h-5 w-5 lg:h-6 lg:w-6 rtl:rotate-90" />
            </div>
            <span className="text-xs font-semibold text-foreground lg:text-sm">
              {t.home.request}
            </span>
          </button>

          <Link
            href="/history"
            className="group flex cursor-pointer flex-col items-center rounded-xl p-1 transition hover:bg-surface-muted active:scale-95"
          >
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary transition group-hover:bg-secondary-soft lg:h-14 lg:w-14">
              <FileText className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <span className="text-xs font-semibold text-foreground lg:text-sm">
              {t.home.history}
            </span>
          </Link>
        </Card>

        {user?.role === "ADMIN" ? (
          <Link
            href="/admin"
            className="mx-6 mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/30 hover:shadow-md active:scale-[0.99] lg:mx-auto lg:max-w-4xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t.admin.openAdmin}
                </p>
                <p className="text-[11px] font-medium text-muted">
                  {t.admin.subtitle}
                </p>
              </div>
            </div>
          </Link>
        ) : null}
      </div>

      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="w-full space-y-6 lg:mx-auto lg:grid lg:max-w-4xl lg:grid-cols-12 lg:gap-8 lg:space-y-0">
          <div className="space-y-3 lg:col-span-7">
            <h2 className="text-sm font-bold tracking-tight text-foreground lg:text-base">
              {t.home.paymentList}
            </h2>
            <Card className="p-4 lg:p-6">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {paymentServices.map((service) => {
                  const Icon = service.icon;
                  return (
                    <Link
                      key={service.label}
                      href={service.href}
                      className="group flex cursor-pointer flex-col items-center space-y-2 rounded-2xl p-2 transition hover:bg-surface-muted active:scale-95"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition group-hover:scale-105 group-hover:shadow-md ${service.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-center text-[11px] font-semibold leading-tight text-foreground transition group-hover:text-primary">
                        {service.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-3 pb-4 lg:col-span-5 lg:pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-foreground lg:text-base">
                {t.home.promoTitle}
              </h2>
              <button className="cursor-pointer text-xs font-semibold text-primary hover:underline active:opacity-80">
                {t.home.seeMore}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-promo-gradient p-6 text-primary-foreground shadow-lg lg:min-h-[180px] lg:flex lg:flex-col lg:justify-between">
              <div className="relative z-10 max-w-[260px] space-y-2.5">
                <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-white/80">
                  {t.home.limitedTime}
                </span>
                <h3 className="text-base font-bold leading-snug lg:text-lg">
                  {t.home.specialOffer}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {t.home.specialOfferDesc}
                </p>
              </div>
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-secondary/30 blur-2xl rtl:right-auto rtl:-left-6" />
            </div>
          </div>
        </div>
      </div>

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </AppShell>
  );
}
