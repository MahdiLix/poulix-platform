import type { WithdrawResponse } from '@/features/withdrawal/lib/withdraw';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type DepositResponse = {
  paymentId: string;
  authority: string;
  paymentUrl: string;
  amount: number;
};

export type DepositCallbackResponse = {
  status: string;
  alreadyVerified?: boolean;
  authority?: string;
  refId?: string | null;
  balance?: string | number;
  currency?: string;
};

/** Same-origin by default; Next.js rewrites proxy to the Nest backend on :3001. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const ACCESS_TOKEN_COOKIE = 'poulix_access_token';
const LEGACY_TOKEN_STORAGE_KEY = 'poulix_access_token';
const DEFAULT_TOKEN_MAX_AGE_SECONDS = 900;

function isAuthSessionEndpoint(endpoint: string) {
  const path = endpoint.split('?')[0];
  return path === '/auth/login' || path === '/auth/register';
}

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

function tokenMaxAgeSeconds(token: string) {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return DEFAULT_TOKEN_MAX_AGE_SECONDS;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof payload.exp === 'number') {
      return Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
    }
  } catch {
    // Fall back to the backend default JWT lifetime.
  }

  return DEFAULT_TOKEN_MAX_AGE_SECONDS;
}

function clearLegacyLocalStorageToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function getStoredToken(): string | null {
  if (!isBrowser()) return null;
  clearLegacyLocalStorageToken();

  const prefix = `${encodeURIComponent(ACCESS_TOKEN_COOKIE)}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) return null;

  const value = decodeURIComponent(match.slice(prefix.length));
  return value || null;
}

export function setStoredToken(token: string) {
  if (!isBrowser()) return;
  clearLegacyLocalStorageToken();
  document.cookie = `${encodeURIComponent(ACCESS_TOKEN_COOKIE)}=${encodeURIComponent(token)}; ${cookieAttributeString(tokenMaxAgeSeconds(token))}`;
}

export function removeStoredToken() {
  if (!isBrowser()) return;
  clearLegacyLocalStorageToken();
  document.cookie = `${encodeURIComponent(ACCESS_TOKEN_COOKIE)}=; ${cookieAttributeString(0)}`;
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredToken());
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const attachToken = Boolean(token) && !isAuthSessionEndpoint(endpoint);

  if (attachToken && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Failed login/register is 401 and must not wipe an existing session.
  if (response.status === 401 && attachToken) {
    removeStoredToken();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || response.statusText || 'An error occurred';
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  return data;
}

export const api = {
  register: (data: RegisterPayload): Promise<AuthResponse> =>
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload): Promise<AuthResponse> =>
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth('/users/me'),

  getWallet: () => fetchWithAuth('/wallets/me'),
  getBalance: () => fetchWithAuth('/wallets/balance'),

  deposit: (amount: number): Promise<DepositResponse> =>
    fetchWithAuth('/wallets/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  completeDepositCallback: (
    authority: string,
    status: string,
  ): Promise<DepositCallbackResponse> =>
    fetchWithAuth(
      `/wallets/deposit/callback?Authority=${encodeURIComponent(authority)}&Status=${encodeURIComponent(status)}`,
    ),

  withdraw: (data: {
    amount: number;
    accountNumber?: string;
    shabaNumber?: string;
  }): Promise<WithdrawResponse> =>
    fetchWithAuth('/wallets/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTransactions: () => fetchWithAuth('/transactions'),
};
