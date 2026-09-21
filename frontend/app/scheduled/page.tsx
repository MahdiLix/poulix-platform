"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { api, ApiRequestError } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { ScheduledPaymentList } from "@/features/scheduled-payments/components/ScheduledPaymentList";
import type { ScheduledPayment } from "@/features/scheduled-payments/lib/scheduledPayments";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function ScheduledPaymentsPage() {
  const { t } = useLanguage();
  const { status: authStatus } = useUser();
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      setPayments([]);
      setStatus("ready");
      return;
    }
    void loadPayments();
  }, [authStatus]);

  async function loadPayments() {
    setStatus("loading");
    setError(null);

    try {
      const data = await api.getScheduledPayments();
      setPayments(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setStatus("ready");
        return;
      }
      setError(localizeError(err, t.messages, "failedToLoadScheduledPayments"));
      setStatus("error");
    }
  }

  async function handleStatusChange(
    id: string,
    action: "pause" | "resume" | "cancel",
  ) {
    try {
      await api.updateScheduledPaymentStatus(id, action);
      await loadPayments();
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadScheduledPayments"));
    }
  }

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.scheduled.title}
        backHref="/"
        subtitle={t.scheduled.description}
        trailing={
          <Link href="/scheduled/new">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.scheduled.createBtn}</span>
            </Button>
          </Link>
        }
      />

      <div className="mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:max-w-5xl lg:p-6">
        {status === "loading" ? (
          <p className="py-8 text-center text-xs font-semibold text-muted">
            {t.scheduled.loading}
          </p>
        ) : status === "error" ? (
          <div className="space-y-3 py-8 text-center">
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
              {error}
            </div>
            <Button variant="secondary" onClick={() => void loadPayments()}>
              {t.common.retry}
            </Button>
          </div>
        ) : (
          <ScheduledPaymentList
            payments={payments}
            onStatusChange={handleStatusChange}
          />
        )}

        <Link href="/scheduled/new" className="block">
          <Button className="w-full">{t.scheduled.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
