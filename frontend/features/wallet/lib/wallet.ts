export type WalletBalanceResponse = {
  balance: string | number;
  currency?: string;
};

export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIrr(
  amount: number,
  currency = "IRR",
  locale: string | "en" | "fa" = "en-US",
): string {
  const whole = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const resolvedLocale =
    locale === "fa" ? "fa-IR" : locale === "en" ? "en-US" : locale;
  return `${whole.toLocaleString(resolvedLocale, { maximumFractionDigits: 0 })} ${currency}`;
}

export function formatAmountDigits(
  amount: number | string,
  language: "en" | "fa" = "en",
): string {
  const whole =
    typeof amount === "number"
      ? Math.trunc(amount)
      : Math.trunc(Number(amount) || 0);
  return whole.toLocaleString(language === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 0,
  });
}
