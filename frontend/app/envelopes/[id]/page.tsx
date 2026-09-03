"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import {
  parseEnvelopeAmount,
  statusTone,
  validateEnvelopeMoveAmount,
  type Envelope,
} from "@/features/envelopes/lib/envelopes";

export default function EnvelopeDetailPage() {
  const params = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { balance, currency, refresh } = useWalletBalance();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    void loadEnvelope();
  }, [params.id]);

  async function loadEnvelope() {
    if (!getStoredToken()) {
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

      <div className="space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-lg">
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
            <p className="text-2xl font-extrabold text-foreground">
              {formatIrr(allocated, currency)}
            </p>
          </div>
        </Card>

        {isActive ? (
          <Card className="space-y-3 p-5">
            <TextField
              label={t.envelopes.amountIrr}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
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
            <div className="grid grid-cols-2 gap-3">
              <Button disabled={loading} onClick={() => void handleAllocate()}>
                {loading ? t.envelopes.processing : t.envelopes.allocateBtn}
              </Button>
              <Button
                variant="secondary"
                disabled={loading || allocated === 0}
                onClick={() => void handleRelease()}
              >
                {loading ? t.envelopes.processing : t.envelopes.releaseBtn}
              </Button>
            </div>
            {allocated === 0 ? (
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => void handleCancel()}
              >
                {t.envelopes.cancelEnvelopeBtn}
              </Button>
            ) : null}
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
                        ? "font-extrabold text-primary"
                        : "font-extrabold text-success"
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
