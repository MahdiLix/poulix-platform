"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { ScheduledPaymentList } from "@/features/scheduled-payments/components/ScheduledPaymentList";
import type { ScheduledPayment } from "@/features/scheduled-payments/lib/scheduledPayments";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function ScheduledPaymentsPage() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPayments();
  }, []);

  async function loadPayments() {
    if (!getStoredToken()) {
      setPayments([]);
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const data = await api.getScheduledPayments();
      setPayments(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        setStatus("unauthenticated");
        return;
      }
      setError(localizeError(err, t.messages, "failedToLoadScheduledPayments"));
      setStatus("error");
    }
  }

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.scheduled.title}
        backHref="/"
        variant="hero"
        trailing={
          <Link
            href="/scheduled/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition hover:bg-white/20"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="mt-2 flex flex-1 flex-col space-y-4 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t.scheduled.subtitle}
            </h2>
            <p className="text-xs font-medium text-muted">
              {t.scheduled.description}
            </p>
          </div>
        </div>

        {status === "loading" ? (
          <p className="py-8 text-center text-xs font-semibold text-muted">
            {t.scheduled.loading}
          </p>
        ) : status === "unauthenticated" ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm font-bold text-foreground">
              {t.scheduled.signInRequired}
            </p>
            <Link href="/login">
              <Button className="w-full">{t.common.signIn}</Button>
            </Link>
          </div>
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
          <ScheduledPaymentList payments={payments} />
        )}

        <Link href="/scheduled/new" className="block">
          <Button className="w-full">{t.scheduled.createBtn}</Button>
        </Link>
      </div>
    </AppShell>
  );
}
