import type { TransferRecipient } from "@/features/p2p-transfer/lib/transfer";
import type { TranslationDictionary } from "@/shared/i18n/translations";

export type ScheduledPaymentFrequency = "ONCE" | "WEEKLY" | "MONTHLY";
export type ScheduledPaymentStatus =
  "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";

export type ScheduledPaymentExecutionStatus = "SUCCESS" | "FAILED";

export type ScheduledPaymentExecution = {
  id: string;
  status: ScheduledPaymentExecutionStatus;
  scheduledFor: string;
  failureReason?: string | null;
  executedAt: string;
};

export type ScheduledPayment = {
  id: string;
  amount: string | number;
  reason?: string | null;
  category?: string | null;
  frequency: ScheduledPaymentFrequency;
  startDate: string;
  nextExecutionAt: string;
  endDate?: string | null;
  status: ScheduledPaymentStatus;
  createdAt: string;
  recipientUser: TransferRecipient;
  executions?: ScheduledPaymentExecution[];
};

export type CreateScheduledPaymentPayload = {
  recipient: string;
  amount: number;
  frequency: ScheduledPaymentFrequency;
  startDate: string;
  endDate?: string;
  reason?: string;
  category?: string;
};

type Messages = TranslationDictionary["messages"];

export const SCHEDULED_FREQUENCIES: ScheduledPaymentFrequency[] = [
  "ONCE",
  "WEEKLY",
  "MONTHLY",
];

export function validateScheduledAmount(
  amount: number,
  messages: Messages,
): string | null {
  if (!Number.isFinite(amount) || amount < 1) {
    return messages.transferAmountRequired;
  }

  if (!Number.isInteger(amount)) {
    return messages.amountWholeNumberMin;
  }

  return null;
}

export function validateScheduledStartDate(
  startDate: string,
  messages: Messages,
): string | null {
  if (!startDate.trim()) {
    return messages.scheduledStartDateRequired;
  }

  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return messages.scheduledStartDateInvalid;
  }

  return null;
}

export function toIsoDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDayIso(dateInput: string): string {
  const date = new Date(`${dateInput}T00:00:00`);
  return date.toISOString();
}

export function statusTone(
  status: ScheduledPaymentStatus,
): "success" | "warning" | "muted" | "danger" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "FAILED":
      return "danger";
    case "COMPLETED":
    case "CANCELLED":
      return "muted";
    default:
      return "muted";
  }
}
