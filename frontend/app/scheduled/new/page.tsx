"use client";

import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { ScheduledPaymentForm } from "@/features/scheduled-payments/components/ScheduledPaymentForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NewScheduledPaymentPage() {
  const { t } = useLanguage();

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.scheduled.createTitle}
        backHref="/scheduled"
        subtitle={t.scheduled.createSub}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">
        <ScheduledPaymentForm />
      </div>
    </AppShell>
  );
}
