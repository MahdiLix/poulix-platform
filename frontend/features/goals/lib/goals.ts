import type { TranslationDictionary } from "@/shared/i18n/translations";
import { parseAmount } from "@/features/wallet/lib/wallet";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type GoalContributionType = "CONTRIBUTE" | "RELEASE";

export type GoalContribution = {
  id: string;
  amount: string | number;
  type: GoalContributionType;
  createdAt: string;
};

export type Goal = {
  id: string;
  title: string;
  description?: string | null;
  targetAmount: string | number;
  savedAmount: string | number;
  targetDate?: string | null;
  status: GoalStatus;
  createdAt: string;
  contributions?: GoalContribution[];
};

export type GoalsListResponse = {
  goals: Goal[];
  summary: {
    totalSavedInGoals: string | number;
  };
};

export type GoalActionResponse = {
  goal: Goal;
  balance: string | number;
  currency: string;
};

export type CreateGoalPayload = {
  title: string;
  targetAmount: number;
  description?: string;
  targetDate?: string;
};

type Messages = TranslationDictionary["messages"];

export function parseGoalAmount(value: string | number): number {
  return parseAmount(value);
}

export function goalProgressPercent(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((saved / target) * 100));
}

export function goalRemainingAmount(saved: number, target: number): number {
  return Math.max(0, target - saved);
}

export function validateGoalTitle(
  title: string,
  messages: Messages,
): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return messages.goalTitleRequired;
  }
  if (trimmed.length > 120) {
    return messages.goalTitleTooLong;
  }
  return null;
}

export function validateGoalTargetAmount(
  amount: number,
  messages: Messages,
): string | null {
  if (!Number.isFinite(amount) || amount < 1) {
    return messages.goalTargetAmountRequired;
  }
  if (!Number.isInteger(amount)) {
    return messages.amountWholeNumberMin;
  }
  return null;
}

export function validateGoalMoveAmount(
  amount: number,
  max: number | null,
  messages: Messages,
): string | null {
  if (!Number.isFinite(amount) || amount < 1) {
    return messages.goalAmountRequired;
  }
  if (!Number.isInteger(amount)) {
    return messages.amountWholeNumberMin;
  }
  if (max !== null && amount > max) {
    return messages.insufficientFunds;
  }
  return null;
}

export function statusTone(
  status: GoalStatus,
): "success" | "warning" | "muted" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "muted";
    default:
      return "muted";
  }
}

export function toIsoDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}
