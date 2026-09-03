export type FinancialDestinationType =
  "P2P_USER" | "BANK_ACCOUNT" | "SHABA" | "CARD";

export type FinancialDestination = {
  id: string;
  type: FinancialDestinationType;
  label: string;
  maskedValue: string;
  recipientUserId: string | null;
  recipientUsername: string | null;
  isSaved: boolean;
  useCount: number;
  lastUsedAt: string;
  createdAt: string;
};

export type CreateSavedDestinationPayload = {
  label: string;
  type: FinancialDestinationType;
  recipient?: string;
  accountNumber?: string;
  shabaNumber?: string;
  cardNumber?: string;
};

export type DestinationValueResponse =
  | { type: "P2P_USER"; recipientUsername: string; recipientUserId: string }
  | { type: "BANK_ACCOUNT"; accountNumber: string }
  | { type: "SHABA"; shabaNumber: string }
  | { type: "CARD"; cardNumber: string };
