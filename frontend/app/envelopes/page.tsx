"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageSpinner } from "@/shared/ui/Spinner";
import { api, ApiRequestError } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { EnvelopeCard } from "@/features/envelopes/components/EnvelopeCard";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import type {
  Envelope,
  EnvelopeMovement,
} from "@/features/envelopes/lib/envelopes";
import { parseEnvelopeAmount } from "@/features/envelopes/lib/envelopes";

const ENVELOPE_COLORS = [
  "#1a7a68",
  "#4a8ea8",
  "#c4a05a",
  "#c45c4a",
  "#7c6bc4",
  "#2ea88f",
];

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

type AllocationSegment = {
  envelope: Envelope;
  color: string;
  percent: number;
};

export default function EnvelopesPage() {
  const { t, language } = useLanguage();
  const { status: authStatus } = useUser();
  const { status, balance, currency, error: walletError } = useWalletBalance();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      window.location.replace("/login");
      return;
    }
    void loadEnvelopes();
  }, [authStatus]);

  async function loadEnvelopes() {
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
      if (err instanceof ApiRequestError && err.status === 401) {
        window.location.replace("/login");
        return;
      }
      setListError(localizeError(err, t.messages, "failedToLoadEnvelopes"));
      setPageStatus("error");
    }
  }

  async function cancelEnvelope(id: string) {
    setCancellingId(id);
    setListError(null);
    try {
      await api.cancelEnvelope(id);
      await loadEnvelopes();
    } catch (err) {
      setListError(localizeError(err, t.messages, "genericError"));
    } finally {
      setCancellingId(null);
    }
  }

  const availableBalance = balance ?? 0;
  const totalWealth = availableBalance + totalAllocated;

  const segments: AllocationSegment[] = useMemo(() => {
    if (totalAllocated <= 0 || envelopes.length === 0) return [];
    return envelopes.map((envelope, i) => ({
      envelope,
      color: ENVELOPE_COLORS[i % ENVELOPE_COLORS.length],
      percent: parseEnvelopeAmount(envelope.allocatedAmount) / totalAllocated,
    }));
  }, [envelopes, totalAllocated]);

  const lastAllocations: (EnvelopeMovement & { envelopeName: string })[] =
    useMemo(() => {
      const items = envelopes
        .flatMap((envelope) =>
          (envelope.movements || []).map((movement) => ({
            ...movement,
            envelopeName: envelope.name,
          })),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4);
      return items;
    }, [envelopes]);

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.envelopes.title}
        backHref="/"
        subtitle={t.envelopes.description}
        trailing={
          <Link href="/envelopes/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.envelopes.createBtn}</span>
            </Button>
          </Link>
        }
      />

      <div className="mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:max-w-5xl lg:p-6">
        <Card className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t.envelopes.availableBalance}
              </p>
              <p className="mt-1 text-lg font-bold text-success">
                {status === "ready"
                  ? formatIrr(availableBalance, currency)
                  : "—"}
              </p>
              {status === "error" && walletError ? (
                <p className="mt-1 text-[10px] font-medium text-danger">
                  {walletError}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t.envelopes.allocatedInEnvelopes}
              </p>
              <p className="mt-1 text-lg font-bold text-warning">
                {formatIrr(totalAllocated, currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t.envelopes.totalWealth}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatIrr(totalWealth, currency)}
              </p>
            </div>
          </div>

          {segments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-muted">
                {segments.map((segment, i) => (
                  <div
                    key={segment.envelope.id}
                    className="h-full"
                    style={{
                      width: `${segment.percent * 100}%`,
                      backgroundColor:
                        ENVELOPE_COLORS[i % ENVELOPE_COLORS.length],
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                {segments.map((segment, i) => (
                  <div
                    key={segment.envelope.id}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          ENVELOPE_COLORS[i % ENVELOPE_COLORS.length],
                      }}
                    />
                    <span className="font-medium text-foreground">
                      {segment.envelope.name}
                    </span>
                    <span className="text-muted">
                      {(segment.percent * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        {pageStatus === "loading" ? (
          <PageSpinner label={t.envelopes.loading} />
        ) : pageStatus === "unauthenticated" ? null : pageStatus === "error" ? (
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
          <div className="grid gap-4 sm:grid-cols-2">
            {envelopes.map((envelope, i) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                color={ENVELOPE_COLORS[i % ENVELOPE_COLORS.length]}
                onCancel={(id) => void cancelEnvelope(id)}
                cancelling={cancellingId === envelope.id}
              />
            ))}
          </div>
        )}

        {pageStatus === "ready" && lastAllocations.length > 0 ? (
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Last allocations
              </h3>
              <Link
                href="/history"
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t.home.seeMore}
              </Link>
            </div>
            <div className="space-y-2">
              {lastAllocations.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-soft text-success">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {movement.type === "ALLOCATE"
                          ? "Allocated to"
                          : "Released from"}{" "}
                        {movement.envelopeName}
                      </p>
                      {movement.type === "ALLOCATE" ? (
                        <p className="text-muted">Budget allocation</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-success">
                      {movement.type === "ALLOCATE" ? "+" : "-"}
                      {formatIrr(parseEnvelopeAmount(movement.amount))}
                    </p>
                    <p className="text-[10px] text-muted">
                      {formatDisplayDateTime(movement.createdAt, language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Link href="/envelopes/new" className="block lg:hidden">
          <Button className="w-full">{t.envelopes.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
