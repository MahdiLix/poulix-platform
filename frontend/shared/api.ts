import type { WithdrawResponse } from "@/features/withdrawal/lib/withdraw";
import type {
  LookupUserResponse,
  TransferResponse,
} from "@/features/p2p-transfer/lib/transfer";
import type {
  CreateScheduledPaymentPayload,
  ScheduledPayment,
} from "@/features/scheduled-payments/lib/scheduledPayments";
import type {
  CreateGoalPayload,
  Goal,
  GoalActionResponse,
  GoalsListResponse,
} from "@/features/goals/lib/goals";
import type {
  CreateEnvelopePayload,
  Envelope,
  EnvelopeActionResponse,
  EnvelopesListResponse,
} from "@/features/envelopes/lib/envelopes";
import type {
  Notification,
  UnreadCountResponse,
} from "@/features/notifications/lib/notifications";
import type {
  CreateSavedDestinationPayload,
  DestinationValueResponse,
  FinancialDestination,
} from "@/features/financial-destinations/lib/destinations";
import type {
  SpendingLimitSummary,
  UpdateSpendingLimitPayload,
} from "@/features/spending-limits/lib/spendingLimits";
import type {
  SecurityEvent,
  UserSession,
} from "@/features/security/lib/security";
import type {
  AdminAuditLog,
  AdminDashboard,
  AdminPaginated,
  AdminPayment,
  AdminPaymentDetail,
  AdminSecurityEvent,
  AdminTransaction,
  AdminTransactionDetail,
  AdminUserDetail,
  AdminUserSummary,
} from "@/features/admin/lib/admin";

export type AuthUser = {
  id: string;
  email: string;
  role?: "USER" | "ADMIN";
  username?: string;
  status?: "ACTIVE" | "DISABLED" | "LOCKED";
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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const ACCESS_TOKEN_COOKIE = "poulix_access_token";
const LEGACY_TOKEN_STORAGE_KEY = "poulix_access_token";
const DEFAULT_TOKEN_MAX_AGE_SECONDS = 900;

function isAuthSessionEndpoint(endpoint: string) {
  const path = endpoint.split("?")[0].replace(/^\/api/, "");
  return path === "/auth/login" || path === "/auth/register";
}

function formatEndpoint(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (clean.startsWith("/api/")) {
    return `${API_BASE_URL}${clean}`;
  }
  return `${API_BASE_URL}/api${clean}`;
}

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

function tokenMaxAgeSeconds(token: string) {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) {
      return DEFAULT_TOKEN_MAX_AGE_SECONDS;
    }

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof payload.exp === "number") {
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
    .split(";")
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
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const attachToken = Boolean(token) && !isAuthSessionEndpoint(endpoint);

  if (attachToken && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = formatEndpoint(endpoint);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Failed login/register is 401 and must not wipe an existing session.
  if (response.status === 401 && attachToken) {
    removeStoredToken();
    if (
      isBrowser() &&
      window.location.pathname !== "/login" &&
      window.location.pathname !== "/register"
    ) {
      window.location.href = "/login";
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message || response.statusText || "An error occurred";
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(", ") : errorMsg);
  }

  return data;
}

export const api = {
  register: (data: RegisterPayload): Promise<AuthResponse> =>
    fetchWithAuth("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload): Promise<AuthResponse> =>
    fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => fetchWithAuth("/users/me"),

  getWallet: () => fetchWithAuth("/wallets/me"),
  getBalance: () => fetchWithAuth("/wallets/balance"),

  deposit: (amount: number): Promise<DepositResponse> =>
    fetchWithAuth("/wallets/deposit", {
      method: "POST",
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
    reason?: string;
    category?: string;
  }): Promise<WithdrawResponse> =>
    fetchWithAuth("/wallets/withdraw", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  lookupUser: (identifier: string): Promise<LookupUserResponse> =>
    fetchWithAuth(
      `/users/lookup?identifier=${encodeURIComponent(identifier.trim())}`,
    ),

  transferP2P: (data: {
    recipient: string;
    amount: number;
    reason?: string;
    category?: string;
  }): Promise<TransferResponse> =>
    fetchWithAuth("/wallets/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getScheduledPayments: (): Promise<ScheduledPayment[]> =>
    fetchWithAuth("/scheduled-payments"),

  getScheduledPayment: (id: string): Promise<ScheduledPayment> =>
    fetchWithAuth(`/scheduled-payments/${id}`),

  createScheduledPayment: (
    data: CreateScheduledPaymentPayload,
  ): Promise<ScheduledPayment> =>
    fetchWithAuth("/scheduled-payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateScheduledPaymentStatus: (
    id: string,
    action: "pause" | "resume" | "cancel",
  ): Promise<ScheduledPayment> =>
    fetchWithAuth(`/scheduled-payments/${id}/${action}`, {
      method: "POST",
    }),

  getGoals: (): Promise<GoalsListResponse> => fetchWithAuth("/goals"),

  getGoal: (id: string): Promise<Goal> => fetchWithAuth(`/goals/${id}`),

  createGoal: (data: CreateGoalPayload): Promise<Goal> =>
    fetchWithAuth("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  contributeToGoal: (id: string, amount: number): Promise<GoalActionResponse> =>
    fetchWithAuth(`/goals/${id}/contribute`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  releaseFromGoal: (id: string, amount: number): Promise<GoalActionResponse> =>
    fetchWithAuth(`/goals/${id}/release`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  cancelGoal: (id: string): Promise<Goal> =>
    fetchWithAuth(`/goals/${id}/cancel`, {
      method: "POST",
    }),

  getEnvelopes: (): Promise<EnvelopesListResponse> =>
    fetchWithAuth("/envelopes"),

  getEnvelope: (id: string): Promise<Envelope> =>
    fetchWithAuth(`/envelopes/${id}`),

  createEnvelope: (data: CreateEnvelopePayload): Promise<Envelope> =>
    fetchWithAuth("/envelopes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  allocateToEnvelope: (
    id: string,
    amount: number,
  ): Promise<EnvelopeActionResponse> =>
    fetchWithAuth(`/envelopes/${id}/allocate`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  releaseFromEnvelope: (
    id: string,
    amount: number,
  ): Promise<EnvelopeActionResponse> =>
    fetchWithAuth(`/envelopes/${id}/release`, {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  cancelEnvelope: (id: string): Promise<Envelope> =>
    fetchWithAuth(`/envelopes/${id}/cancel`, {
      method: "POST",
    }),

  getNotifications: (): Promise<Notification[]> =>
    fetchWithAuth("/notifications"),

  getUnreadNotificationCount: (): Promise<UnreadCountResponse> =>
    fetchWithAuth("/notifications/unread-count"),

  markNotificationRead: (id: string): Promise<Notification> =>
    fetchWithAuth(`/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllNotificationsRead: (): Promise<{ success: boolean }> =>
    fetchWithAuth("/notifications/read-all", {
      method: "POST",
    }),

  getRecentDestinations: (): Promise<FinancialDestination[]> =>
    fetchWithAuth("/financial-destinations/recent"),

  getSavedDestinations: (): Promise<FinancialDestination[]> =>
    fetchWithAuth("/financial-destinations/saved"),

  createSavedDestination: (
    data: CreateSavedDestinationPayload,
  ): Promise<FinancialDestination> =>
    fetchWithAuth("/financial-destinations/saved", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSavedDestination: (
    id: string,
    label: string,
  ): Promise<FinancialDestination> =>
    fetchWithAuth(`/financial-destinations/saved/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ label }),
    }),

  deleteSavedDestination: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`/financial-destinations/saved/${id}`, {
      method: "DELETE",
    }),

  getDestinationValue: (id: string): Promise<DestinationValueResponse> =>
    fetchWithAuth(`/financial-destinations/${id}/value`),

  getSpendingLimits: (): Promise<SpendingLimitSummary[]> =>
    fetchWithAuth("/spending-limits"),

  updateSpendingLimit: (
    data: UpdateSpendingLimitPayload,
  ): Promise<{ type: string; maxAmount: number }> =>
    fetchWithAuth("/spending-limits", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getSecuritySessions: (): Promise<UserSession[]> =>
    fetchWithAuth("/security/sessions"),

  getSecurityEvents: (): Promise<SecurityEvent[]> =>
    fetchWithAuth("/security/events"),

  revokeSecuritySession: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`/security/sessions/${id}/revoke`, {
      method: "POST",
    }),

  touchSecuritySession: (): Promise<void> =>
    fetchWithAuth("/security/touch", { method: "POST" }),

  getTransactions: () => fetchWithAuth("/transactions"),

  getAdminDashboard: (): Promise<AdminDashboard> =>
    fetchWithAuth("/admin/dashboard"),

  getAdminUsers: (params?: {
    q?: string;
    status?: string;
    page?: number;
  }): Promise<AdminPaginated<AdminUserSummary>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/users${suffix}`);
  },

  getAdminUser: (id: string): Promise<AdminUserDetail> =>
    fetchWithAuth(`/admin/users/${id}`),

  adminDisableUser: (id: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${id}/disable`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason }),
    }),

  adminEnableUser: (id: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${id}/enable`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason }),
    }),

  adminLockUser: (id: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${id}/lock`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason }),
    }),

  adminUnlockUser: (id: string, reason?: string) =>
    fetchWithAuth(`/admin/users/${id}/unlock`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason }),
    }),

  getAdminTransactions: (params?: {
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: number;
  }): Promise<AdminPaginated<AdminTransaction>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.type) query.set("type", params.type);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/transactions${suffix}`);
  },

  getAdminTransaction: (id: string): Promise<AdminTransactionDetail> =>
    fetchWithAuth(`/admin/transactions/${id}`),

  getAdminPayments: (params?: {
    q?: string;
    status?: string;
    page?: number;
  }): Promise<AdminPaginated<AdminPayment>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/payments${suffix}`);
  },

  getAdminPayment: (id: string): Promise<AdminPaymentDetail> =>
    fetchWithAuth(`/admin/payments/${id}`),

  getAdminWithdrawals: (params?: {
    q?: string;
    page?: number;
  }): Promise<AdminPaginated<AdminTransaction>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/withdrawals${suffix}`);
  },

  getAdminSecurityEvents: (params?: {
    q?: string;
    page?: number;
  }): Promise<AdminPaginated<AdminSecurityEvent>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/security-events${suffix}`);
  },

  getAdminAuditLogs: (params?: {
    page?: number;
  }): Promise<AdminPaginated<AdminAuditLog>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return fetchWithAuth(`/admin/audit-logs${suffix}`);
  },
};
