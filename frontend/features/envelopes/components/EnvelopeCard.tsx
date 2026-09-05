"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bus,
  Car,
  Eye,
  Gamepad2,
  Home,
  Monitor,
  Plus,
  ShoppingCart,
  Utensils,
  Wallet,
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatIrr } from "@/features/wallet/lib/wallet";
import {
  parseEnvelopeAmount,
  statusTone,
  type Envelope,
} from "@/features/envelopes/lib/envelopes";

type EnvelopeCardProps = {
  envelope: Envelope;
  color?: string;
};

const ENVELOPE_COLORS = [
  "#1a7a68",
  "#4a8ea8",
  "#c4a05a",
  "#c45c4a",
  "#7c6bc4",
  "#2ea88f",
];

function envelopeIcon(name: string, className: string): ReactNode {
  const lower = name.toLowerCase();
  if (lower.includes("rent") || lower.includes("home") || lower.includes("house")) return <Home className={className} />;
  if (lower.includes("grocer") || lower.includes("food") || lower.includes("dining")) return <ShoppingCart className={className} />;
  if (lower.includes("transport") || lower.includes("bus") || lower.includes("commute")) return <Bus className={className} />;
  if (lower.includes("car") || lower.includes("vehicle") || lower.includes("auto")) return <Car className={className} />;
  if (lower.includes("entertain") || lower.includes("fun") || lower.includes("game")) return <Gamepad2 className={className} />;
  if (lower.includes("dining") || lower.includes("restaurant") || lower.includes("eat")) return <Utensils className={className} />;
  if (lower.includes("tech") || lower.includes("laptop") || lower.includes("computer")) return <Monitor className={className} />;
  if (lower.includes("wallet") || lower.includes("general") || lower.includes("fund")) return <Wallet className={className} />;
  return <Wallet className={className} />;
}

function monthlyPlan(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("rent") || lower.includes("home")) return 5_000_000;
  if (lower.includes("grocery") || lower.includes("food")) return 3_000_000;
  if (lower.includes("transport") || lower.includes("car")) return 2_000_000;
  if (lower.includes("entertain") || lower.includes("fun")) return 1_000_000;
  return 5_000_000;
}

export function EnvelopeCard({ envelope, color }: EnvelopeCardProps) {
  const { t } = useLanguage();
  const allocated = parseEnvelopeAmount(envelope.allocatedAmount);
  const tone = statusTone(envelope.status);
  const accentColor = color || ENVELOPE_COLORS[0];
  const plan = monthlyPlan(envelope.name);
  const planProgress = Math.min(100, plan > 0 ? Math.round((allocated / plan) * 100) : 0);

  return (
    <Card className="flex flex-col gap-4 p-4 transition hover:border-primary/25">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border"
          style={{ color: accentColor }}
        >
          {envelopeIcon(envelope.name, "h-5 w-5")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-sm font-bold text-foreground">
                {envelope.name}
              </h3>
              <p className="text-sm font-bold text-success">
                {formatIrr(allocated)}
              </p>
            </div>
            <Badge variant={tone === "success" ? "success" : "muted"}>
              {t.envelopes.statuses[envelope.status]}
            </Badge>
          </div>
          {envelope.description ? (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted">
              {envelope.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
          <span>{planProgress}% of typical monthly plan</span>
          <span>{formatIrr(plan)}</span>
        </div>
        <ProgressBar value={planProgress} barClassName="bg-primary" />
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Link href={`/envelopes/${envelope.id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full gap-1 text-success hover:text-success">
            <Plus className="h-3.5 w-3.5" />
            {t.envelopes.allocateBtn}
          </Button>
        </Link>
        <Link href={`/envelopes/${envelope.id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full text-danger hover:text-danger">
            {t.envelopes.releaseBtn}
          </Button>
        </Link>
        <Link href={`/envelopes/${envelope.id}`}>
          <Button size="sm" variant="ghost" className="px-2 text-success hover:text-success">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
