import { toRawAmountDigits } from "@/shared/ui/latinDigits";

export type WalletBalanceResponse = {
  balance: string | number;
  currency?: string;
};

export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  const digits = toRawAmountDigits(value);
  if (!digits) {
    return 0;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIrr(
  amount: number | string | null | undefined,
  currency = "IRR",
  locale: string | "en" | "fa" = "en-US",
): string {
  void locale;
  const formatted = new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(parseAmount(amount));
  return `${formatted} ${currency}`;
}

export function formatAmountDigits(
  amount: number | string,
  language: "en" | "fa" = "en",
): string {
  void language;
  return new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(parseAmount(amount));
}
