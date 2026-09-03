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
