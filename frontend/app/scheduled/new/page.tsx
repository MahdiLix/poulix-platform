"use client";

import { CalendarClock } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { ScheduledPaymentForm } from "@/features/scheduled-payments/components/ScheduledPaymentForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NewScheduledPaymentPage() {
  const { t } = useLanguage();

  return (
    <AppShell showBottomNav={false} variant="hero">
      <HeaderBar
        title={t.scheduled.createTitle}
        backHref="/scheduled"
        variant="hero"
      />

      <div className="mt-2 flex flex-1 flex-col space-y-6 rounded-t-[36px] bg-background p-6 lg:mx-auto lg:w-full lg:max-w-lg lg:rounded-3xl lg:shadow-xl lg:my-6">
        <div className="pt-2 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CalendarClock className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t.scheduled.createHeading}
          </h2>
          <p className="text-xs font-medium text-muted">
            {t.scheduled.createSub}
          </p>
        </div>

        <ScheduledPaymentForm />
      </div>
    </AppShell>
  );
}
