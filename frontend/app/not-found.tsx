"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { Button } from "@/shared/ui/Button";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-canvas via-background to-primary-soft px-6 py-16 text-center">
      <div className="pointer-events-none absolute -top-36 -start-28 h-96 w-96 rounded-full bg-primary/15 blur-3xl sm:h-[32rem] sm:w-[32rem]" />
      <div className="pointer-events-none absolute -end-32 -bottom-40 h-[30rem] w-[30rem] rounded-full bg-secondary/15 blur-3xl" />
      <span className="pointer-events-none absolute text-[13rem] font-black leading-none text-primary/[0.035] sm:text-[22rem] lg:text-[30rem]">
        404
      </span>

      <div className="relative z-10 flex max-w-2xl flex-col items-center">
        <BrandLogo size={72} />
        <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-surface/80 text-primary shadow-xl backdrop-blur sm:h-24 sm:w-24">
          <SearchX className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <p className="mt-7 text-sm font-bold tracking-[0.3em] text-primary uppercase">
          404
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
          {t.common.pageNotFound}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-muted sm:text-base">
          {t.common.pageNotFoundSub}
        </p>
        <Link href="/" className="mt-9">
          <Button size="lg" className="w-auto gap-2 px-8 shadow-lg shadow-primary/20">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t.common.backToApp}
          </Button>
        </Link>
      </div>
    </div>
  );
}
