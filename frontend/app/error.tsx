"use client";

import { BrandLogo } from "@/shared/brand/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <BrandLogo size={64} />
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        {t.messages.errors.generic}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {t.common.pageNotFoundSub}
      </p>
      <Button className="mt-6 w-auto px-6" onClick={() => reset()}>
        {t.common.retry}
      </Button>
    </div>
  );
}
