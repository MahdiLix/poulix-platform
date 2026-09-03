export const TRANSACTION_CATEGORIES = [
  "DINNER",
  "LUNCH",
  "RENT",
  "SHOPPING",
  "GIFT",
  "TRANSPORTATION",
  "FAMILY_SUPPORT",
  "OTHER",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export function isTransactionCategory(
  value: string,
): value is TransactionCategory {
  return (TRANSACTION_CATEGORIES as readonly string[]).includes(value);
}
