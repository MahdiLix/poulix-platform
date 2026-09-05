"use client";

import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { CreateGoalForm } from "@/features/goals/components/CreateGoalForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NewGoalPage() {
  const { t } = useLanguage();

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.goals.createTitle}
        backHref="/goals"
        subtitle={t.goals.createSub}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-6">
        <CreateGoalForm />
      </div>
    </AppShell>
  );
}
