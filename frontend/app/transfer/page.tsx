"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { WithdrawForm } from "@/features/withdrawal/components/WithdrawForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { api, getStoredToken } from "@/shared/api";
import { formatIrr } from "@/features/wallet/lib/wallet";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

export default function WithdrawPage() {
  const { t } = useLanguage();
  const [limits, setLimits] = useState<SpendingLimitSummary[]>([]);
  const [saved, setSaved] = useState<FinancialDestination[]>([]);

  useEffect(() => {
    if (!getStoredToken()) return;
    void Promise.all([
      api.getSpendingLimits().catch(() => [] as SpendingLimitSummary[]),
      api.getSavedDestinations().catch(() => [] as FinancialDestination[]),
    ]).then(([limitList, savedList]) => {
      setLimits(limitList);
      setSaved(
        savedList.filter(
          (item) => item.type === "BANK_ACCOUNT" || item.type === "SHABA",
        ),
      );
    });
  }, []);

  const daily = limits.find((item) => item.type === "DAILY_WITHDRAWAL");

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.withdrawal.withdrawTitle}
        backHref="/"
        subtitle={t.withdrawal.withdrawSubtitle}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-4 lg:p-6">
        <Card className="flex-1 space-y-6 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
              <ArrowUpRight className="h-5 w-5 rtl:rotate-[-90deg]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t.withdrawal.withdrawFromWallet}
              </h2>
              <p className="text-xs text-muted">
                {t.withdrawal.withdrawSubtitle}
              </p>
            </div>
          </div>
          <Suspense fallback={null}>
            <WithdrawForm />
          </Suspense>
        </Card>

        <div className="hidden w-80 shrink-0 flex-col gap-4 lg:flex">
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.withdrawal.savedBankTitle}
              </p>
              <Link
                href="/destinations"
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t.home.seeMore}
              </Link>
            </div>
            {saved.length === 0 ? (
              <p className="text-xs text-muted">{t.destinations.emptySaved}</p>
            ) : (
              <ul className="space-y-2">
                {saved.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/transfer?destinationId=${encodeURIComponent(item.id)}`}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.label}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {item.maskedValue}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex items-start gap-2 rounded-[14px] bg-primary-soft p-4 text-xs text-primary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t.withdrawal.withdrawInfo}</p>
          </div>

          {daily ? (
            <Card className="space-y-3 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.withdrawal.dailyLimitLabel}
              </p>
              <p className="text-sm font-bold">
                {formatIrr(daily.usedAmount, daily.currency)} /{" "}
                {formatIrr(daily.maxAmount, daily.currency)}
              </p>
              <ProgressBar value={daily.usedAmount} max={daily.maxAmount} />
              <p className="text-[11px] text-muted">
                {t.security.remaining}:{" "}
                {formatIrr(daily.remainingAmount, daily.currency)}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
