import type { TranslationDictionary } from "@/shared/i18n/translations";

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "GOAL_CONTRIBUTE"
  | "GOAL_RELEASE"
  | "ENVELOPE_ALLOCATE"
  | "ENVELOPE_RELEASE";

const TYPES = new Set<TransactionType>([
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "GOAL_CONTRIBUTE",
  "GOAL_RELEASE",
  "ENVELOPE_ALLOCATE",
  "ENVELOPE_RELEASE",
]);

export function transactionTypeLabel(
  type: string,
  t: TranslationDictionary,
): string {
  if (TYPES.has(type as TransactionType)) {
    return t.transaction.types[type as TransactionType];
  }
  return type.replaceAll("_", " ").toLocaleLowerCase().replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase());
}

export function transactionReasonLabel(
  reason: string | null | undefined,
  t: TranslationDictionary,
): string {
  if (!reason) return "";

  const goalContribution = /^Goal contribution:\s*(.+)$/i.exec(reason);
  if (goalContribution) {
    return `${t.transaction.reasons.goalContribution}: ${goalContribution[1]}`;
  }
  const goalRelease = /^Goal release:\s*(.+)$/i.exec(reason);
  if (goalRelease) {
    return `${t.transaction.reasons.goalRelease}: ${goalRelease[1]}`;
  }
  const envelopeAllocation = /^Envelope allocation:\s*(.+)$/i.exec(reason);
  if (envelopeAllocation) {
    return `${t.transaction.reasons.envelopeAllocation}: ${envelopeAllocation[1]}`;
  }
  const envelopeRelease = /^Envelope release:\s*(.+)$/i.exec(reason);
  if (envelopeRelease) {
    return `${t.transaction.reasons.envelopeRelease}: ${envelopeRelease[1]}`;
  }

  const systemReasons: Record<string, string> = {
    "Insufficient funds": t.messages.insufficientFunds,
    "Cannot transfer to yourself": t.messages.cannotTransferToSelf,
    "Wallet not found": t.messages.walletNotFound,
  };
  return systemReasons[reason] ?? reason;
}
