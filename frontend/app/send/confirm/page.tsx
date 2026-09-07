"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  MessageSquare,
  Tag,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Card } from "@/shared/ui/Card";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useUser } from "@/shared/user/UserProvider";
import {
  clearSendConfirmPayload,
  readSendConfirmPayload,
  type SendConfirmPayload,
} from "@/features/p2p-transfer/lib/transfer";
import {
  isTransactionCategory,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";
import { SendRightRail } from "@/features/p2p-transfer/components/SendRightRail";
import { flashToast } from "@/shared/ui/Toast";
import type { SpendingLimitSummary } from "@/features/spending-limits/lib/spendingLimits";
import type { FinancialDestination } from "@/features/financial-destinations/lib/destinations";

function ConfirmRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="min-w-0 flex-1 text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ConfirmContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useUser();
  const { balance, currency } = useWalletBalance();
  const [payload, setPayload] = useState<SendConfirmPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState<SpendingLimitSummary[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<
    FinancialDestination[]
  >([]);
  const [recentDestinations, setRecentDestinations] = useState<
    FinancialDestination[]
  >([]);

  useEffect(() => {
    const stored = readSendConfirmPayload();
    if (!stored) {
      router.replace("/send");
      return;
    }
    setPayload(stored);
  }, [router]);

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
        amount: parseAmount(payload.amount),
        reason: payload.reason,
        category: payload.category,
        envelopeId: payload.envelopeId,
      });

      clearSendConfirmPayload();

      const params = new URLSearchParams({
        amount: String(payload.amount),
        recipient: payload.recipientUser.username,
        email: payload.recipientUser.email,
        balance: String(response.balance),
        currency: response.currency,
      });
      if (payload.reason) params.set("reason", payload.reason);
      if (payload.category) params.set("category", payload.category);

      flashToast({
        title: t.send.sendSuccessful,
        description: t.messages.success.transferSuccess,
      });
      router.push(`/send/success?${params.toString()}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "transferFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!payload) {
    return <PageSpinner label={t.common.loading} />;
  }

  const categoryLabel =
    payload.category && isTransactionCategory(payload.category)
      ? t.history.categories[payload.category as TransactionCategory]
      : null;
  const sourceBalance = payload.envelopeId
    ? (payload.fundingSourceBalance ?? null)
    : balance;
  const remainingAfter =
    sourceBalance !== null ? Math.max(0, sourceBalance - payload.amount) : null;
  const initial = payload.recipientUser.username.slice(0, 1).toUpperCase();
  const walletName = user?.username || user?.email?.split("@")[0] || "Poulix";

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.send.confirmTitle}
        backHref="/send"
        subtitle={t.send.confirmSubtitle}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-4 lg:p-6">
        <Card className="flex-1 space-y-6 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-foreground">
                {payload.recipientUser.username}
              </p>
              <p className="truncate text-xs text-muted">
                {payload.recipientUser.username} · {payload.recipientUser.email}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Check className="h-3 w-3" strokeWidth={3} />
              {t.send.verified}
            </span>
          </div>

          <p className="amount text-3xl font-extrabold tracking-tight text-foreground">
            {formatIrr(payload.amount)}
          </p>

          <div className="divide-y divide-border border-y border-border">
            {categoryLabel ? (
              <ConfirmRow
                icon={Tag}
                label={t.send.categoryLabel}
                value={categoryLabel}
              />
            ) : null}
            {payload.reason ? (
              <ConfirmRow
                icon={MessageSquare}
                label={t.send.reasonLabel}
                value={payload.reason}
              />
            ) : null}
            <ConfirmRow
              icon={Wallet}
              label={t.send.fromWallet}
              value={payload.fundingSourceLabel || walletName}
            />
            {remainingAfter !== null ? (
              <ConfirmRow
                icon={Clock}
                label={t.send.remainingAfterSend}
                value={formatIrr(remainingAfter, currency)}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded-[10px] bg-warning-soft px-3 py-2.5 text-xs font-medium text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t.send.cannotBeUndone}
          </div>

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
        </Card>

        <SendRightRail
          limits={limits}
          savedDestinations={savedDestinations}
          recentDestinations={recentDestinations}
        />
      </div>
    </AppShell>
  );
}

export default function SendConfirmPage() {
  const { t } = useLanguage();

  return (
    <Suspense
      fallback={
        <PageSpinner label={t.common.loading} />
      }
    >
      <ConfirmContent />
    </Suspense>
  );
}
