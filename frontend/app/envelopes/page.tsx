"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { EnvelopeCard } from "@/features/envelopes/components/EnvelopeCard";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import type { Envelope } from "@/features/envelopes/lib/envelopes";
import { parseEnvelopeAmount } from "@/features/envelopes/lib/envelopes";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function EnvelopesPage() {
  const { t } = useLanguage();
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    void loadEnvelopes();
  }, []);

  async function loadEnvelopes() {
    if (!getStoredToken()) {
      setPageStatus("unauthenticated");
      return;
    }

    setPageStatus("loading");
    setListError(null);

    try {
      const data = await api.getEnvelopes();
      setEnvelopes(data.envelopes);
      setTotalAllocated(
        parseEnvelopeAmount(data.summary.totalAllocatedInEnvelopes),
      );
      setPageStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        setPageStatus("unauthenticated");
        return;
      }
      setListError(localizeError(err, t.messages, "failedToLoadEnvelopes"));
      setPageStatus("error");
    }
  }

  const availableBalance = balance ?? 0;
  const totalWealth = availableBalance + totalAllocated;

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.envelopes.title}
        backHref="/"
        variant="hero"
        trailing={
          <Link
            href="/envelopes/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition hover:bg-white/20"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="mt-2 flex flex-1 flex-col space-y-4 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t.envelopes.subtitle}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.envelopes.description}
            </p>
          </div>
        </div>

        <Card className="space-y-3 p-4">
          <WalletBalance
            status={status}
            balance={balance}
            currency={currency}
            error={error}
            onRetry={() => void refresh()}
            variant="compact"
            label={t.envelopes.availableBalance}
          />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-surface-muted p-3">
              <p className="font-semibold text-muted">
                {t.envelopes.allocatedInEnvelopes}
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatIrr(totalAllocated, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-muted p-3">
              <p className="font-semibold text-muted">
                {t.envelopes.totalWealth}
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatIrr(totalWealth, currency)}
              </p>
            </div>
          </div>
        </Card>

        {pageStatus === "loading" ? (
          <p className="py-8 text-center text-xs font-semibold text-muted">
            {t.envelopes.loading}
          </p>
        ) : pageStatus === "unauthenticated" ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.envelopes.signInRequired}
            </p>
            <Link href="/login">
              <Button className="w-full">{t.common.signIn}</Button>
            </Link>
          </div>
        ) : pageStatus === "error" ? (
          <div className="space-y-3 py-8 text-center">
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
              {listError}
            </div>
            <Button variant="secondary" onClick={() => void loadEnvelopes()}>
              {t.common.retry}
            </Button>
          </div>
        ) : envelopes.length === 0 ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.envelopes.emptyTitle}
            </p>
            <p className="text-xs text-muted">{t.envelopes.emptySub}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {envelopes.map((envelope) => (
              <EnvelopeCard key={envelope.id} envelope={envelope} />
            ))}
          </div>
        )}

        <Link href="/envelopes/new" className="block">
          <Button className="w-full">{t.envelopes.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
