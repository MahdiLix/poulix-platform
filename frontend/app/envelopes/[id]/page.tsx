"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { AmountField } from "@/shared/ui/AmountField";
import { api } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useToast } from "@/shared/ui/Toast";
import {
  parseEnvelopeAmount,
  statusTone,
  validateEnvelopeMoveAmount,
  type Envelope,
} from "@/features/envelopes/lib/envelopes";

export default function EnvelopeDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { status: authStatus } = useUser();
  const { pushToast } = useToast();
  const { balance, currency, refresh } = useWalletBalance();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    void loadEnvelope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, authStatus]);

  async function loadEnvelope() {
    if (authStatus === "unauthenticated") {
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError("");

    try {
      const data = await api.getEnvelope(params.id);
      setEnvelope(data);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadEnvelopes"));
    } finally {
      setPageLoading(false);
    }
  }

  async function handleAllocate() {
    if (!envelope) return;

    const parsed = parseAmount(amount);
    const validation = validateEnvelopeMoveAmount(parsed, balance, t.messages);
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.allocateToEnvelope(envelope.id, parsed);
      setAmount("");
      await refresh();
      await loadEnvelope();
      pushToast({
        title: t.envelopes.allocatedToEnvelope,
        description: t.messages.success.envelopeAllocated,
      });
    } catch (err) {
      setError(localizeError(err, t.messages, "envelopeAllocateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    if (!envelope) return;

    const parsed = parseAmount(amount);
    const allocated = parseEnvelopeAmount(envelope.allocatedAmount);
    if (parsed > allocated) {
      setError(t.messages.envelopeBalanceExceeded);
      return;
    }

    const validation = validateEnvelopeMoveAmount(
      parsed,
      allocated,
      t.messages,
    );
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.releaseFromEnvelope(envelope.id, parsed);
      setAmount("");
      await refresh();
      await loadEnvelope();
      pushToast({
        title: t.envelopes.releasedFromEnvelope,
        description: t.messages.success.envelopeReleased,
      });
    } catch (err) {
      setError(localizeError(err, t.messages, "envelopeReleaseFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!envelope) return;

    setLoading(true);
    setError("");

    try {
      const updated = await api.cancelEnvelope(envelope.id);
      setEnvelope({ ...updated, movements: envelope.movements });
    } catch (err) {
      setError(localizeError(err, t.messages, "envelopeCancelFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.envelopes.detailTitle} backHref="/envelopes" />
        <p className="p-8 text-center text-xs font-semibold text-muted">
          {t.envelopes.loading}
        </p>
      </AppShell>
    );
  }

  if (!envelope) {
    return (
      <AppShell showBottomNav={false}>
        <HeaderBar title={t.envelopes.detailTitle} backHref="/envelopes" />
        <div className="space-y-3 p-6">
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
            {error || t.messages.genericError}
          </div>
          <Button variant="secondary" onClick={() => void loadEnvelope()}>
            {t.common.retry}
          </Button>
        </div>
      </AppShell>
    );
  }

  const allocated = parseEnvelopeAmount(envelope.allocatedAmount);
  const tone = statusTone(envelope.status);
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-surface-muted text-muted";
  const isActive = envelope.status === "ACTIVE";

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.envelopes.detailTitle} backHref="/envelopes" />

      <div className="space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-5xl">
        <Card className="space-y-4 p-5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${toneClass}`}
          >
            {t.envelopes.statuses[envelope.status]}
          </span>

          <div>
            <h2 className="text-xl font-bold text-foreground">
              {envelope.name}
            </h2>
            {envelope.description ? (
              <p className="mt-1 text-xs font-medium text-muted">
                {envelope.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-surface-muted p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.envelopes.allocated}
            </p>
            <p className="amount text-2xl font-extrabold text-foreground">
              {formatIrr(allocated, currency)}
            </p>
          </div>
        </Card>

        {isActive ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3 p-5">
              <h3 className="text-sm font-bold">{t.envelopes.allocateBtn}</h3>
              <p className="text-xs text-muted">
                {t.envelopes.availableBalance}{" "}
                <span className="amount font-bold text-primary">
                  {formatIrr(balance ?? 0, currency)}
                </span>
              </p>
              <AmountField
                label={t.envelopes.amountIrr}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
              />
              {error ? (
                <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
                  {error}
                </div>
              ) : null}
              <Button disabled={loading} onClick={() => void handleAllocate()}>
                {loading ? t.envelopes.processing : t.envelopes.allocateBtn}
              </Button>
            </Card>
            <Card className="space-y-3 p-5">
              <h3 className="text-sm font-bold">{t.envelopes.releaseBtn}</h3>
              <AmountField
                label={t.envelopes.amountIrr}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
              />
              <Button
                variant="secondary"
                disabled={loading || allocated === 0}
                onClick={() => void handleRelease()}
              >
                {loading ? t.envelopes.processing : t.envelopes.releaseBtn}
              </Button>
            </Card>
          </div>
        ) : null}

        {isActive && allocated === 0 ? (
          <Card className="flex flex-col items-start justify-between gap-3 border-danger/40 p-5 sm:flex-row sm:items-center">
            <p className="text-sm font-bold text-danger">
              {t.envelopes.cancelEnvelopeBtn}
            </p>
            <Button
              variant="danger"
              className="w-auto"
              disabled={loading}
              onClick={() => void handleCancel()}
            >
              {t.envelopes.cancelEnvelopeBtn}
            </Button>
          </Card>
        ) : null}

        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-foreground">
            {t.envelopes.movementHistory}
          </h3>
          {!envelope.movements || envelope.movements.length === 0 ? (
            <p className="text-xs font-medium text-muted">
              {t.envelopes.noMovements}
            </p>
          ) : (
            <div className="space-y-2">
              {envelope.movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {movement.type === "ALLOCATE"
                        ? t.envelopes.allocatedToEnvelope
                        : t.envelopes.releasedFromEnvelope}
                    </p>
                    <p className="text-muted">
                      {formatDisplayDateTime(movement.createdAt, language)}
                    </p>
                  </div>
                  <span
                    className={
                      movement.type === "ALLOCATE"
                        ? "amount shrink-0 font-extrabold text-primary"
                        : "amount shrink-0 font-extrabold text-success"
                    }
                  >
                    {movement.type === "ALLOCATE" ? "-" : "+"}
                    {formatIrr(parseEnvelopeAmount(movement.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
