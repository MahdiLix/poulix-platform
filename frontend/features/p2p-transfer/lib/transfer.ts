import type { TransactionCategory } from "@/features/wallet/lib/transactionMeta";
import type { TranslationDictionary } from "@/shared/i18n/translations";

export type TransferRecipient = {
  id: string;
  username: string;
  email: string;
};

export type TransferResponse = {
  balance: string | number;
  currency: string;
  recipient: TransferRecipient;
  transfer: {
    outTransactionId: string;
    inTransactionId: string;
  };
};

export type LookupUserResponse =
  { found: true; user: TransferRecipient } | { found: false; self?: true };

export const SEND_CONFIRM_STORAGE_KEY = "poulix_send_confirm";

export type SendConfirmPayload = {
  recipient: string;
  recipientUser: TransferRecipient;
  amount: number;
  envelopeId?: string;
  fundingSourceLabel?: string;
  fundingSourceBalance?: number;
  reason?: string;
  category?: TransactionCategory;
};

type Messages = TranslationDictionary["messages"];

export function validateTransferAmount(
  amount: number,
  balance: number | null,
  messages: Messages,
): string | null {
  if (!Number.isFinite(amount) || amount < 1) {
    return messages.transferAmountRequired;
  }

  if (!Number.isInteger(amount)) {
    return messages.amountWholeNumberMin;
  }

  if (balance !== null && amount > balance) {
    return messages.insufficientFunds;
  }

  return null;
}

export function validateRecipientIdentifier(
  identifier: string,
  messages: Messages,
): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return messages.recipientRequired;
  }

  if (trimmed.length < 3) {
    return messages.recipientTooShort;
  }

  return null;
}

export function readSendConfirmPayload(): SendConfirmPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SEND_CONFIRM_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SendConfirmPayload;
  } catch {
    return null;
  }
}

export function writeSendConfirmPayload(payload: SendConfirmPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    SEND_CONFIRM_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function clearSendConfirmPayload() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SEND_CONFIRM_STORAGE_KEY);
}
