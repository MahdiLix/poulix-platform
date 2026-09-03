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

export function formatIrr(amount: number, currency = "IRR"): string {
  const whole = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${whole.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}
