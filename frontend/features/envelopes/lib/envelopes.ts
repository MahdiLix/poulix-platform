import type { TranslationDictionary } from "@/shared/i18n/translations";

export type EnvelopeStatus = "ACTIVE" | "CANCELLED";
export type EnvelopeMovementType = "ALLOCATE" | "RELEASE";

export type EnvelopeMovement = {
  id: string;
  amount: string | number;
  type: EnvelopeMovementType;
  createdAt: string;
};

export type Envelope = {
  id: string;
  name: string;
  description?: string | null;
  allocatedAmount: string | number;
  status: EnvelopeStatus;
  createdAt: string;
  movements?: EnvelopeMovement[];
};

export type EnvelopesListResponse = {
  envelopes: Envelope[];
  summary: {
    totalAllocatedInEnvelopes: string | number;
  };
};

export type EnvelopeActionResponse = {
  envelope: Envelope;
  balance: string | number;
  currency: string;
};

export type CreateEnvelopePayload = {
  name: string;
  description?: string;
};

type Messages = TranslationDictionary["messages"];

export function parseEnvelopeAmount(value: string | number): number {
  return Number(value.toString());
}

export function validateEnvelopeName(
  name: string,
  messages: Messages,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return messages.envelopeNameRequired;
  }
  if (trimmed.length > 120) {
    return messages.envelopeNameTooLong;
  }
  return null;
}

export function validateEnvelopeMoveAmount(
  amount: number,
  max: number | null,
  messages: Messages,
): string | null {
  if (!Number.isFinite(amount) || amount < 1) {
    return messages.envelopeAmountRequired;
  }
  if (!Number.isInteger(amount)) {
    return messages.amountWholeNumberMin;
  }
  if (max !== null && amount > max) {
    return messages.insufficientFunds;
  }
  return null;
}

export function statusTone(status: EnvelopeStatus): "success" | "muted" {
  return status === "ACTIVE" ? "success" : "muted";
}
