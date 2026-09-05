"use client";

import { Layers } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { CreateEnvelopeForm } from "@/features/envelopes/components/CreateEnvelopeForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NewEnvelopePage() {
  const { t } = useLanguage();

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.envelopes.createTitle}
        backHref="/envelopes"
      />

      <div className="mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:max-w-xl lg:p-6">
        <div className="pt-2 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t.envelopes.createHeading}
          </h2>
          <p className="text-xs font-medium text-muted">
            {t.envelopes.createSub}
          </p>
        </div>

        <CreateEnvelopeForm />
      </div>
    </AppShell>
  );
}
