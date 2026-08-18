import type { TranslationDictionary } from '@/shared/i18n/translations';

type Messages = TranslationDictionary['messages'];

export type WithdrawDestination = 'account' | 'shaba';

export type WithdrawResponse = {
  balance: string | number;
  currency?: string;
};

export function validateWithdrawAmount(
  raw: string,
  messages: Messages,
  availableBalance?: number | null,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return messages.withdrawAmountRequired;
  }

  const amount = Number(trimmed);
  if (!Number.isInteger(amount) || amount < 1) {
    return messages.amountWholeNumberMin;
  }

  if (typeof availableBalance === 'number' && amount > availableBalance) {
    return messages.insufficientFunds;
  }

  return null;
}

export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '');
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
  const compact = raw.replace(/[\s-]/g, '').toUpperCase();
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

const ACCOUNT_NUMBER_COOKIE = 'poulix_account_number';
const SHABA_NUMBER_COOKIE = 'poulix_shaba_number';
const DESTINATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function cookieAttributeString(maxAgeSeconds: number) {
  const parts = ['Path=/', `Max-Age=${maxAgeSeconds}`, 'SameSite=Lax'];
  if (isBrowser() && window.location.protocol === 'https:') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(';')
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
    return '';
  }
  return saved;
}

export function saveAccountNumber(raw: string) {
  const value = normalizeAccountNumber(raw);
  if (!/^\d{10,18}$/.test(value)) return;
  writeCookie(ACCOUNT_NUMBER_COOKIE, value);
}

export function getSavedShabaNumber(): string {
  const saved = readCookie(SHABA_NUMBER_COOKIE);
  if (!saved || !/^IR\d{24}$/.test(normalizeShabaNumber(saved))) {
    return '';
  }
  return saved;
}

export function saveShabaNumber(raw: string) {
  const value = normalizeShabaNumber(raw);
  if (!/^IR\d{24}$/.test(value)) return;
  writeCookie(SHABA_NUMBER_COOKIE, value);
}
