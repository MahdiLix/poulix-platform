import type { TransferRecipient } from "@/features/p2p-transfer/lib/transfer";
import { startOfDayIso } from "@/shared/i18n/dates";
import type { TranslationDictionary } from "@/shared/i18n/translations";

export { startOfDayIso, toIsoDateInput } from "@/shared/i18n/dates";

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
  followingExecutionAt?: string | null;
  upcomingExecutions?: string[];
  endDate?: string | null;
  status: ScheduledPaymentStatus;
  createdAt: string;
  recipientUser: TransferRecipient;
  envelopeId?: string | null;
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
  envelopeId?: string;
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

  try {
    const date = new Date(startOfDayIso(startDate));
    if (Number.isNaN(date.getTime())) {
      return messages.scheduledStartDateInvalid;
    }
  } catch {
    return messages.scheduledStartDateInvalid;
  }

  return null;
}

export function addCalendarWeeks(from: Date, weeks: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + weeks * 7);
  return next;
}

export function addCalendarMonths(from: Date, months: number): Date {
  const next = new Date(from);
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months, day);
  if (next.getUTCDate() !== day) {
    next.setUTCDate(0);
  }
  return next;
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
