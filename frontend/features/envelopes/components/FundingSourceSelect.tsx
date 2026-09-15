"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { Select } from "@/shared/ui/Select";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import type { Envelope } from "@/features/envelopes/lib/envelopes";

export type FundingSource = {
  envelopeId?: string;
  label: string;
  balance: number | null;
};

export function FundingSourceSelect({
  value,
  onChange,
  walletBalance,
  currency = "IRR",
}: {
  value: string;
  onChange: (source: FundingSource) => void;
  walletBalance: number | null;
  currency?: string;
}) {
  const { language } = useLanguage();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const mainWalletLabel = language === "fa" ? "کیف پول اصلی" : "Main wallet";
  const fieldLabel = language === "fa" ? "منبع پرداخت" : "Payment source";

  useEffect(() => {
    if (!getStoredToken()) return;
    void api
      .getEnvelopes()
      .then((result) => {
        setEnvelopes(
          (result.envelopes ?? []).filter(
            (envelope) =>
              envelope.status === "ACTIVE" &&
              parseAmount(envelope.allocatedAmount) > 0,
          ),
        );
      })
      .catch(() => setEnvelopes([]));
  }, []);

  const sources = useMemo<FundingSource[]>(
    () => [
      { label: mainWalletLabel, balance: walletBalance },
      ...envelopes.map((envelope) => ({
        envelopeId: envelope.id,
        label: envelope.name,
        balance: parseAmount(envelope.allocatedAmount),
      })),
    ],
    [envelopes, mainWalletLabel, walletBalance],
  );

  return (
    <Select
      label={fieldLabel}
      value={value}
      onChange={(next) => {
        const source = sources.find((item) => (item.envelopeId ?? "") === next);
        if (source) onChange(source);
      }}
      options={sources.map((source) => ({
        value: source.envelopeId ?? "",
        label:
          source.balance == null
            ? source.label
            : `${source.label} · ${formatIrr(source.balance, currency)}`,
      }))}
    />
  );
}
