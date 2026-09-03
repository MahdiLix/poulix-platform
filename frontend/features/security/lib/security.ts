export type SecurityEventType =
  | "NEW_DEVICE_LOGIN"
  | "FAILED_LOGIN"
  | "FAILED_TRANSFER"
  | "FAILED_WITHDRAWAL"
  | "LIMIT_EXCEEDED"
  | "SUSPICIOUS_ACTIVITY"
  | "SESSION_REVOKED";

export type UserSession = {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  isCurrent: boolean;
};

export type SecurityEvent = {
  id: string;
  type: SecurityEventType;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};
