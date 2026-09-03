"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatIrr } from "@/features/wallet/lib/wallet";
import {
  parseEnvelopeAmount,
  statusTone,
  type Envelope,
} from "@/features/envelopes/lib/envelopes";

type EnvelopeCardProps = {
  envelope: Envelope;
};

export function EnvelopeCard({ envelope }: EnvelopeCardProps) {
  const { t } = useLanguage();
  const allocated = parseEnvelopeAmount(envelope.allocatedAmount);
  const tone = statusTone(envelope.status);
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-surface-muted text-muted";

  return (
    <Link href={`/envelopes/${envelope.id}`}>
      <Card className="flex items-center justify-between rounded-2xl p-4 transition hover:shadow-md">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${toneClass}`}
            >
              {t.envelopes.statuses[envelope.status]}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-foreground">
            {envelope.name}
          </p>
          <p className="text-[11px] font-medium text-muted">
            {t.envelopes.allocated}: {formatIrr(allocated)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" />
      </Card>
    </Link>
  );
}
