export type NotificationType =
  | "DEPOSIT_SUCCESS"
  | "WITHDRAWAL_SUCCESS"
  | "TRANSFER_SUCCESS"
  | "TRANSFER_RECEIVED"
  | "TRANSFER_FAILED"
  | "SCHEDULED_PAYMENT_SUCCESS"
  | "SCHEDULED_PAYMENT_FAILED"
  | "GOAL_PROGRESS"
  | "GOAL_COMPLETED"
  | "ACCOUNT_EVENT"
  | "SECURITY_WARNING"
  | "SPENDING_LIMIT_WARNING";

export type NotificationCategory = "SUCCESS" | "WARNING" | "ERROR" | "INFO";

export type Notification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export type UnreadCountResponse = {
  count: number;
};
