export type SpendingLimitType =
  | "DAILY_TRANSFER"
  | "DAILY_WITHDRAWAL"
  | "MONTHLY_TRANSFER"
  | "MONTHLY_WITHDRAWAL";

export type SpendingLimitSummary = {
  type: SpendingLimitType;
  maxAmount: number;
  usedAmount: number;
  remainingAmount: number;
  periodStart: string;
  currency: string;
};

export type UpdateSpendingLimitPayload = {
  type: SpendingLimitType;
  maxAmount: number;
};

export function minRemainingLimit(
  limits: SpendingLimitSummary[],
  types: SpendingLimitType[],
): number | null {
  let remaining: number | null = null;
  for (const type of types) {
    const limit = limits.find((item) => item.type === type);
    if (!limit) {
      continue;
    }
    remaining =
      remaining === null
        ? limit.remainingAmount
        : Math.min(remaining, limit.remainingAmount);
  }
  return remaining;
}
