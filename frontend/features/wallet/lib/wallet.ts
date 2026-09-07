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
  void locale;
  const whole = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(whole);
  return `${formatted} ${currency}`;
}

export function formatAmountDigits(
  amount: number | string,
  language: "en" | "fa" = "en",
): string {
  void language;
  const whole =
    typeof amount === "number"
      ? Math.trunc(amount)
      : Math.trunc(Number(amount) || 0);
  return new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(whole);
}
