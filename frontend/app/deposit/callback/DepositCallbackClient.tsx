"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CircleAlert } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { ButtonLink } from "@/shared/ui/Button";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Card } from "@/shared/ui/Card";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatMessage, localizeError } from "@/shared/i18n/localizeError";
import { WalletBalance } from "@/features/wallet/components/WalletBalance";
import { useWalletBalance } from "@/features/wallet/hooks/useWalletBalance";
import { useToast } from "@/shared/ui/Toast";
import { useUser } from "@/shared/user/UserProvider";
import { claimHomepageOffer } from "@/features/offers/lib/offers";

function DepositCallbackContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user } = useUser();
  const { pushToast } = useToast();
  const authority =
    searchParams.get("Authority") || searchParams.get("authority") || "";
  const gatewayStatus =
    searchParams.get("Status") || searchParams.get("status") || "";
  const { status, balance, currency, error, refresh } = useWalletBalance();
  const [result, setResult] = useState<
    "pending" | "paid" | "cancelled" | "failed"
  >("pending");
  const [message, setMessage] = useState<string>(t.deposit.confirmingPayment);
  const toastedRef = useRef(false);

  function notify(toast: {
    title: string;
    description: string;
    variant?: "success" | "danger" | "warning";
  }) {
    if (toastedRef.current) return;
    toastedRef.current = true;
    pushToast(toast);
  }

  useEffect(() => {
    let cancelled = false;

    async function completePayment() {
      if (!authority) {
        setResult("failed");
        setMessage(t.messages.missingAuthority);
        return;
      }

      try {
        const response = await api.completeDepositCallback(
          authority,
          gatewayStatus,
        );
        if (cancelled) return;

        if (response.status === "PAID") {
          setResult("paid");
          setMessage(
            response.alreadyVerified
              ? t.messages.paymentAlreadyVerified
              : t.messages.paymentVerified,
          );
          notify({
            title: t.deposit.depositSuccessful,
            description: t.messages.success.depositSuccess,
            variant: "success",
          });
          await refresh();
          return;
        }

        if (response.status === "CANCELLED" || response.status === "NOK") {
          setResult("cancelled");
          setMessage(t.messages.paymentCancelledDetail);
          notify({
            title: t.deposit.depositCancelled,
            description: t.messages.paymentCancelledDetail,
            variant: "warning",
          });
          await refresh();
          return;
        }

        setResult("failed");
        setMessage(
          formatMessage(t.messages.paymentStatus, {
            status: response.status || "unknown",
          }),
        );
        notify({
          title: t.deposit.depositFailed,
          description: formatMessage(t.messages.paymentStatus, {
            status: response.status || "unknown",
          }),
          variant: "danger",
        });
        await refresh();
      } catch (err) {
        if (cancelled) return;
        setResult("failed");
        setMessage(localizeError(err, t.messages, "paymentVerificationFailed"));
        notify({
          title: t.deposit.depositFailed,
          description: localizeError(
            err,
            t.messages,
            "paymentVerificationFailed",
          ),
          variant: "danger",
        });
        await refresh();
      }
    }

    void completePayment();
    return () => {
      cancelled = true;
    };
  }, [authority, gatewayStatus, pushToast, refresh, t]);

  useEffect(() => {
    if (result === "paid") {
      claimHomepageOffer(user?.id);
    }
  }, [result, user?.id]);

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.deposit.depositStatus} backHref="/" />

      <div className="flex flex-1 flex-col justify-between space-y-6 p-6 lg:mx-auto lg:w-full lg:max-w-md">
        <Card className="mt-2 space-y-6 p-6 text-center shadow-2xl">
          {result === "pending" && (
            <p className="text-xs font-semibold text-muted">{message}</p>
          )}

          {result === "paid" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t.deposit.depositSuccessful}
                </h2>
                <p className="mx-auto mt-1 max-w-[240px] text-xs font-medium text-muted">
                  {message}
                </p>
              </div>
              <WalletBalance
                status={status}
                balance={balance}
                currency={currency}
                error={error}
                onRetry={() => void refresh()}
                variant="heading"
                label={t.common.updatedBalance}
              />
            </>
          )}

          {result === "cancelled" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
                <CircleAlert className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t.deposit.depositCancelled}
                </h2>
                <p className="mx-auto mt-1 max-w-[240px] text-xs font-medium text-muted">
                  {message}
                </p>
              </div>
              <WalletBalance
                status={status}
                balance={balance}
                currency={currency}
                error={error}
                onRetry={() => void refresh()}
                variant="heading"
                label={t.common.currentBalance}
              />
            </>
          )}

          {result === "failed" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
                <CircleAlert className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t.deposit.depositFailed}
                </h2>
                <p className="mx-auto mt-1 max-w-[240px] text-xs font-medium text-danger">
                  {message}
                </p>
              </div>
            </>
          )}
        </Card>

        <ButtonLink href="/">{t.common.backToWallet}</ButtonLink>
      </div>
    </AppShell>
  );
}

export function DepositCallbackClient() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<PageSpinner label={t.common.loading} />}>
      <DepositCallbackContent />
    </Suspense>
  );
}
