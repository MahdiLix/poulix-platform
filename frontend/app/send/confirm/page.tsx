"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import {
  clearSendConfirmPayload,
  readSendConfirmPayload,
  type SendConfirmPayload,
} from "@/features/p2p-transfer/lib/transfer";
import {
  isTransactionCategory,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";

function ConfirmContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [payload, setPayload] = useState<SendConfirmPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = readSendConfirmPayload();
    if (!stored) {
      router.replace("/send");
      return;
    }
    setPayload(stored);
  }, [router]);

  async function handleConfirm() {
    if (!payload) {
      return;
    }

    if (!getStoredToken()) {
      router.push("/login");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await api.transferP2P({
        recipient: payload.recipient,
        amount: payload.amount,
        reason: payload.reason,
        category: payload.category,
      });

      clearSendConfirmPayload();

      const params = new URLSearchParams({
        amount: String(payload.amount),
        recipient: payload.recipientUser.username,
        email: payload.recipientUser.email,
        balance: String(response.balance),
        currency: response.currency,
      });

      router.push(`/send/success?${params.toString()}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "transferFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!payload) {
    return <div className="p-8 text-center text-muted">{t.common.loading}</div>;
  }

  const categoryLabel =
    payload.category && isTransactionCategory(payload.category)
      ? t.history.categories[payload.category as TransactionCategory]
      : null;

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar title={t.send.confirmTitle} backHref="/send" variant="hero" />

      <div className="mt-2 flex flex-1 flex-col space-y-6 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="space-y-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            {t.send.confirmTitle}
          </h2>
          <p className="text-xs font-medium text-muted">
            {t.send.confirmSubtitle}
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.send.recipientLabel}
            </p>
            <p className="text-sm font-bold text-foreground">
              {payload.recipientUser.username}
            </p>
            <p className="text-xs font-medium text-muted">
              {payload.recipientUser.email}
            </p>
          </div>

          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t.send.amountLabel}
            </p>
            <p className="text-xl font-extrabold text-foreground">
              {formatIrr(payload.amount)}
            </p>
          </div>

          {categoryLabel ? (
            <div className="space-y-1 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.send.categoryLabel}
              </p>
              <p className="text-sm font-bold text-foreground">
                {categoryLabel}
              </p>
            </div>
          ) : null}

          {payload.reason ? (
            <div className="space-y-1 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t.send.reasonLabel}
              </p>
              <p className="text-sm font-medium text-foreground">
                {payload.reason}
              </p>
            </div>
          ) : null}
        </Card>

        {error ? (
          <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? t.send.sending : t.send.confirmAndSend}
          </Button>
          <Link href="/send" className="block">
            <Button variant="secondary" className="w-full">
              {t.send.backToEdit}
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export default function SendConfirmPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted">{t.common.loading}</div>
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
