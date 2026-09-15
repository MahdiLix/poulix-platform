"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  Landmark,
  Send,
  Shield,
  User,
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";
import { formatIrr } from "@/features/wallet/lib/wallet";

function DailyLimitCard({ limits }: { limits: SpendingLimitSummary[] }) {
  const { t } = useLanguage();
  const limit = useMemo(
    () => limits.find((l) => l.type === "DAILY_TRANSFER"),
    [limits],
  );

  if (!limit) {
    return (
      <Card className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.send.amountLabel}
        </p>
        <p className="mt-2 text-sm text-muted">{t.destinations.emptySaved}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Send className="h-4 w-4" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Daily Transfer Limit
          </p>
        </div>
        <p className="amount text-lg font-bold tracking-tight text-foreground">
          {formatIrr(limit.usedAmount, limit.currency)} /{" "}
          {formatIrr(limit.maxAmount, limit.currency)}
        </p>
        <ProgressBar
          value={limit.usedAmount}
          max={limit.maxAmount}
          className="w-full"
        />
        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
          <span>
            {t.withdrawal.usedLabel}{" "}
            {formatIrr(limit.usedAmount, limit.currency)}
          </span>
          <span>
            {t.security.remaining}{" "}
            {formatIrr(limit.remainingAmount, limit.currency)}
          </span>
        </div>
      </div>
    </Card>
  );
}

function DestinationIcon({ type }: { type: FinancialDestination["type"] }) {
  if (type === "P2P_USER") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <User className="h-4 w-4" />
      </div>
    );
  }
  if (type === "BANK_ACCOUNT") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
        <Landmark className="h-4 w-4" />
      </div>
    );
  }
  if (type === "SHABA") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted">
        <CreditCard className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple-soft text-accent-purple">
      <Shield className="h-4 w-4" />
    </div>
  );
}

function SavedDestinationsCard({ items }: { items: FinancialDestination[] }) {
  const { t } = useLanguage();
  const display = items.slice(0, 4);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.destinations.savedTitle}
        </p>
        <Link
          href="/destinations"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t.home.seeMore}
        </Link>
      </div>
      {display.length === 0 ? (
        <p className="text-sm text-muted">{t.destinations.emptySaved}</p>
      ) : (
        <div className="space-y-2">
          {display.map((item) => (
            <Link
              key={item.id}
              href={
                item.type === "P2P_USER"
                  ? `/send?destinationId=${encodeURIComponent(item.id)}`
                  : `/transfer?destinationId=${encodeURIComponent(item.id)}`
              }
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2 transition hover:border-primary/30"
            >
              <DestinationIcon type={item.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="truncate text-[11px] text-muted">
                  {t.destinations.types[item.type]}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentRecipientsCard({ items }: { items: FinancialDestination[] }) {
  const { t } = useLanguage();
  const display = useMemo(
    () => items.filter((item) => item.type === "P2P_USER").slice(0, 4),
    [items],
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t.destinations.recentTitle}
        </p>
        <Link
          href="/destinations"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t.home.seeMore}
        </Link>
      </div>
      {display.length === 0 ? (
        <p className="text-sm text-muted">{t.destinations.emptyRecent}</p>
      ) : (
        <div className="space-y-3">
          {display.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <span className="text-xs font-bold uppercase">
                  {item.label.slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted">
                  {t.destinations.types.P2P_USER}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SendRightRail({
  limits,
  savedDestinations,
  recentDestinations,
}: {
  limits: SpendingLimitSummary[];
  savedDestinations: FinancialDestination[];
  recentDestinations: FinancialDestination[];
}) {
  return (
    <div className="hidden w-80 shrink-0 flex-col gap-4 lg:flex">
      <DailyLimitCard limits={limits} />
      <SavedDestinationsCard items={savedDestinations} />
      <RecentRecipientsCard items={recentDestinations} />
    </div>
  );
}
