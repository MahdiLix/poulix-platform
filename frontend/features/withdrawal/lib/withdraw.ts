import type { TranslationDictionary } from "@/shared/i18n/translations";
import type { DestinationValueResponse } from "@/features/financial-destinations/lib/destinations";
import { parseAmount } from "@/features/wallet/lib/wallet";

type Messages = TranslationDictionary["messages"];

export type WithdrawDestination = "account" | "shaba";

export type WithdrawResponse = {
  balance: string | number;
  currency?: string;
};

export function collectWithdrawDestinationValues(
  values: Array<DestinationValueResponse | null>,
): { accounts: string[]; shabas: string[] } {
  const accounts: string[] = [];
  const shabas: string[] = [];
  for (const value of values) {
    if (value?.type === "BANK_ACCOUNT") accounts.push(value.accountNumber);
    if (value?.type === "SHABA") shabas.push(value.shabaNumber);
  }
  return {
    accounts: [...new Set(accounts)],
    shabas: [...new Set(shabas)],
  };
}

export function validateWithdrawAmount(
  raw: string,
  messages: Messages,
  availableBalance?: number | null,
  remainingLimit?: number | null,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return messages.withdrawAmountRequired;
  }

  const amount = parseAmount(trimmed);
  if (!Number.isInteger(amount) || amount < 1) {
    return messages.amountWholeNumberMin;
  }

  if (typeof availableBalance === "number" && amount > availableBalance) {
    return messages.insufficientFunds;
  }

  if (typeof remainingLimit === "number" && amount > remainingLimit) {
    return messages.spendingLimitExceeded;
  }

  return null;
}

export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export function validateAccountNumber(
  raw: string,
  messages: Messages,
): string | null {
  const value = normalizeAccountNumber(raw);
  if (!value) {
    return messages.accountNumberRequired;
  }
  if (!/^\d{10,18}$/.test(value)) {
    return messages.accountNumberInvalid;
  }
  return null;
}

export function normalizeShabaNumber(raw: string): string {
  const compact = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{24}$/.test(compact)) {
    return `IR${compact}`;
  }
  return compact;
}

export function validateShabaNumber(
  raw: string,
  messages: Messages,
): string | null {
  const value = normalizeShabaNumber(raw);
  if (!value) {
    return messages.shabaRequired;
  }
  if (!/^IR\d{24}$/.test(value)) {
    return messages.shabaInvalid;
  }
  return null;
}

export function getSavedAccountNumber(): string {
  return "";
}

export function listRecentAccountNumbers(): string[] {
  return [];
}

export function listRecentShabaNumbers(): string[] {
  return [];
}

export function getSavedShabaNumber(): string {
  return "";
}

export function saveAccountNumber(_raw: string) {}

export function saveShabaNumber(_raw: string) {}
