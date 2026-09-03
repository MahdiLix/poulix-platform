export type UserRole = "USER" | "ADMIN";
export type UserAccountStatus = "ACTIVE" | "DISABLED" | "LOCKED";

export type AdminUserSummary = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserAccountStatus;
  statusChangedAt: string | null;
  statusReason: string | null;
  createdAt: string;
  wallet: {
    id: string;
    currency: string;
    balance: number;
  } | null;
};

export type AdminPaginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminDashboard = {
  users: {
    total: number;
    active: number;
    disabled: number;
    locked: number;
    admins: number;
  };
  wallets: { total: number };
  transactions: {
    deposits: number;
    withdrawals: number;
    transfers: number;
    depositAmount: number;
    withdrawalAmount: number;
    transferAmount: number;
  };
  operations: {
    pendingPayments: number;
    failedPayments: number;
    paidPayments: number;
    failedScheduledExecutions: number;
    suspiciousEvents: number;
  };
  notifications: { total: number; unread: number };
  recentActivity: AdminTransaction[];
  recentSecurityEvents: AdminSecurityEvent[];
  generatedAt: string;
};

export type AdminTransaction = {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  category: string | null;
  createdAt: string;
  walletId: string;
  user: { id: string; username: string; email: string };
  counterparty: { id: string; username: string } | null;
};

export type AdminTransactionDetail = AdminTransaction & {
  relatedTransactionId: string | null;
  scheduledPaymentExecutionId: string | null;
  goalId: string | null;
  envelopeId: string | null;
  relatedTransaction: { id: string; type: string; amount: number } | null;
  scheduledPaymentExecution: {
    id: string;
    status: string;
    failureReason: string | null;
    scheduledFor: string;
  } | null;
};

export type AdminPayment = {
  id: string;
  amount: number;
  status: string;
  refId: string | null;
  createdAt: string;
  updatedAt: string;
  walletId: string;
  user: { id: string; username: string; email: string };
};

export type AdminPaymentDetail = AdminPayment & {
  relatedTransaction: {
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  } | null;
};

export type AdminSecurityEvent = {
  id: string;
  type: string;
  createdAt: string;
  user: { id: string; username: string; email: string };
};

export type AdminAuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  success: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  adminUser: { id: string; username: string; email: string };
};

export type AdminUserDetail = Omit<AdminUserSummary, "wallet"> & {
  wallet: {
    id: string;
    currency: string;
    balance: number;
    createdAt: string;
  } | null;
  recentTransactions: AdminTransaction[];
  securityEvents: AdminSecurityEvent[];
  sessions: Array<{
    id: string;
    deviceLabel: string | null;
    lastSeenAt: string;
    createdAt: string;
  }>;
  recentPayments: AdminPayment[];
};
