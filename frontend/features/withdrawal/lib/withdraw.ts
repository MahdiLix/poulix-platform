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

const ACCOUNT_NUMBER_COOKIE = "poulix_account_number";
const SHABA_NUMBER_COOKIE = "poulix_shaba_number";
const DESTINATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function cookieAttributeString(maxAgeSeconds: number) {
  const parts = ["Path=/", `Max-Age=${maxAgeSeconds}`, "SameSite=Lax"];
  if (isBrowser() && window.location.protocol === "https:") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;

  const value = decodeURIComponent(match.slice(prefix.length));
  return value || null;
}

function writeCookie(name: string, value: string) {
  if (!isBrowser()) return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${cookieAttributeString(DESTINATION_COOKIE_MAX_AGE_SECONDS)}`;
}

export function getSavedAccountNumber(): string {
  const saved = readCookie(ACCOUNT_NUMBER_COOKIE);
  if (!saved || !/^\d{10,18}$/.test(normalizeAccountNumber(saved))) {
    return "";
  }
  return saved;
}

const ACCOUNT_RECENTS_KEY = "poulix_recent_account_numbers";
const SHABA_RECENTS_KEY = "poulix_recent_shaba_numbers";
const MAX_RECENTS = 8;

function readRecentList(key: string): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRecentList(key: string, values: string[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(values.slice(0, MAX_RECENTS)));
}

function rememberValue(key: string, value: string) {
  if (!value) return;
  const next = [value, ...readRecentList(key).filter((item) => item !== value)];
  writeRecentList(key, next);
}

export function listRecentAccountNumbers(): string[] {
  const saved = getSavedAccountNumber();
  const recents = readRecentList(ACCOUNT_RECENTS_KEY);
  return [...new Set([saved, ...recents].filter(Boolean))];
}

export function listRecentShabaNumbers(): string[] {
  const saved = getSavedShabaNumber();
  const recents = readRecentList(SHABA_RECENTS_KEY);
  return [...new Set([saved, ...recents].filter(Boolean))];
}

export function getSavedShabaNumber(): string {
  const saved = readCookie(SHABA_NUMBER_COOKIE);
  if (!saved || !/^IR\d{24}$/.test(normalizeShabaNumber(saved))) {
    return "";
  }
  return saved;
}

export function saveAccountNumber(raw: string) {
  const value = normalizeAccountNumber(raw);
  if (!/^\d{10,18}$/.test(value)) return;
  writeCookie(ACCOUNT_NUMBER_COOKIE, value);
  rememberValue(ACCOUNT_RECENTS_KEY, value);
}

export function saveShabaNumber(raw: string) {
  const value = normalizeShabaNumber(raw);
  if (!/^IR\d{24}$/.test(value)) return;
  writeCookie(SHABA_NUMBER_COOKIE, value);
  rememberValue(SHABA_RECENTS_KEY, value);
}
