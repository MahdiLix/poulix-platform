"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { SendForm } from "@/features/p2p-transfer/components/SendForm";
import { SendRightRail } from "@/features/p2p-transfer/components/SendRightRail";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { api, getStoredToken } from "@/shared/api";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

export default function SendPage() {
  const { t } = useLanguage();
  const [limits, setLimits] = useState<SpendingLimitSummary[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<
    FinancialDestination[]
  >([]);
  const [recentDestinations, setRecentDestinations] = useState<
    FinancialDestination[]
  >([]);

  useEffect(() => {
    if (!getStoredToken()) return;

    void Promise.all([
      api.getSpendingLimits().catch(() => [] as SpendingLimitSummary[]),
      api.getSavedDestinations().catch(() => [] as FinancialDestination[]),
      api.getRecentDestinations().catch(() => [] as FinancialDestination[]),
    ]).then(([limitsList, savedList, recentList]) => {
      setLimits(limitsList);
      setSavedDestinations(savedList);
      setRecentDestinations(recentList);
    });
  }, []);

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.send.sendTitle}
        backHref="/"
        subtitle={t.send.sendSubtitle}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-4 lg:p-6">
        <div className="flex-1">
          <Card className="p-6">
            <SendForm />
          </Card>
        </div>

        <SendRightRail
          limits={limits}
          savedDestinations={savedDestinations}
          recentDestinations={recentDestinations}
        />
      </div>
    </AppShell>
  );
}
