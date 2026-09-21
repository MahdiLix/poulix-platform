import { api } from "@/shared/api";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import type { TranslationDictionary } from "@/shared/i18n/translations";
import { formatMessage } from "@/shared/i18n/localizeError";

type Messages = TranslationDictionary["messages"];

export const DEPOSIT_PRESETS = [
  10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000,
];

export const PENDING_STARTPAY_KEY = "poulix_pending_startpay";

export type PendingStartPay = {
  paymentId: string;
  authority: string;
  paymentUrl: string;
  userId: string;
};

function redirectToStartPay(paymentUrl: string) {
  window.location.assign(paymentUrl);
}

function isTrustedStartPayUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host !== "sandbox.zarinpal.com" && host !== "www.zarinpal.com") {
      return false;
    }
    return /^\/pg\/StartPay\/[^/]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

function parsePendingStartPay(raw: string | null): PendingStartPay | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingStartPay>;
    if (
      typeof parsed.paymentId !== "string" ||
      typeof parsed.authority !== "string" ||
      typeof parsed.paymentUrl !== "string" ||
      typeof parsed.userId !== "string" ||
      !parsed.paymentId ||
      !parsed.authority ||
      !parsed.userId ||
      !isTrustedStartPayUrl(parsed.paymentUrl)
    ) {
      return null;
    }
    return {
      paymentId: parsed.paymentId,
      authority: parsed.authority,
      paymentUrl: parsed.paymentUrl,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}

export function readPendingStartPay(
  userId: string | null | undefined,
): PendingStartPay | null {
  if (typeof window === "undefined" || !userId) return null;
  const pending = parsePendingStartPay(
    window.sessionStorage.getItem(PENDING_STARTPAY_KEY),
  );
  if (!pending) {
    clearPendingStartPay();
    return null;
  }
  if (pending.userId !== userId) {
    clearPendingStartPay();
    return null;
  }
  return pending;
}

export function clearPendingStartPay() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_STARTPAY_KEY);
}

function writePendingStartPay(pending: PendingStartPay) {
  window.sessionStorage.setItem(PENDING_STARTPAY_KEY, JSON.stringify(pending));
}

export function resumePendingStartPay(
  userId: string | null | undefined,
): boolean {
  const pending = readPendingStartPay(userId);
  if (!pending) return false;
  redirectToStartPay(pending.paymentUrl);
  return true;
}

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
  signedIn: boolean,
  userId?: string | null,
): Promise<void> {
  if (!signedIn) {
    throw new Error(messages.pleaseSignInToDeposit);
  }

  const result = await api.deposit(amount);
  if (!result?.paymentUrl || typeof result.paymentUrl !== "string") {
    throw new Error(messages.depositNoPaymentUrl);
  }

  if (
    userId &&
    result.paymentId &&
    result.authority &&
    isTrustedStartPayUrl(result.paymentUrl)
  ) {
    writePendingStartPay({
      paymentId: result.paymentId,
      authority: result.authority,
      paymentUrl: result.paymentUrl,
      userId,
    });
  } else {
    clearPendingStartPay();
  }

  redirectToStartPay(result.paymentUrl);
}

export function depositRedirectHint(
  amount: number,
  messages: Messages,
): string {
  return formatMessage(messages.depositRedirectHint, {
    amount: formatIrr(amount),
  });
}
