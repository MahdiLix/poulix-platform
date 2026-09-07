import { api, getStoredToken } from "@/shared/api";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import type { TranslationDictionary } from "@/shared/i18n/translations";
import { formatMessage } from "@/shared/i18n/localizeError";

type Messages = TranslationDictionary["messages"];

export const DEPOSIT_PRESETS = [
  10_000,
  50_000,
  100_000,
  500_000,
  1_000_000,
  5_000_000,
];

export function validateDepositAmount(
  raw: string,
  messages: Messages,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return messages.depositAmountRequired;
  }

  const amount = parseAmount(trimmed);
  if (!Number.isInteger(amount) || amount < 1) {
    return messages.amountWholeNumberMin;
  }

  return null;
}

export async function startZarinpalDeposit(
  amount: number,
  messages: Messages,
): Promise<void> {
  if (!getStoredToken()) {
    throw new Error(messages.pleaseSignInToDeposit);
  }

  const result = await api.deposit(amount);
  if (!result?.paymentUrl || typeof result.paymentUrl !== "string") {
    throw new Error(messages.depositNoPaymentUrl);
  }

  window.location.assign(result.paymentUrl);
}

export function depositRedirectHint(
  amount: number,
  messages: Messages,
): string {
  return formatMessage(messages.depositRedirectHint, {
    amount: formatIrr(amount),
  });
}
