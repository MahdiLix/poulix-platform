"use client";

import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-canvas px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary-soft),_transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-24 start-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative z-10 flex max-w-md flex-col items-center">
        <BrandLogo size={56} />
        <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <SearchX className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold tracking-[0.22em] text-primary uppercase">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          {t.common.pageNotFound}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t.common.pageNotFoundSub}
        </p>
        <Link href="/" className="mt-8">
          <Button className="w-auto gap-2 px-6">
            <Home className="h-4 w-4" />
            {t.common.goHome}
          </Button>
        </Link>
      </div>
    </div>
  );
}
