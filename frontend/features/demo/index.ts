import {
  DEMO_TRANSACTION_TEMPLATES,
  DEMO_UNREAD_COUNT,
  DEMO_WALLET,
} from "@/features/demo/data";

export type DemoWallet = {
  balance: number;
  currency: string;
};

export type DemoTransaction = {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  reason: string;
  category: string | null;
  counterpartyUser: {
    username: string;
    email: string;
  } | null;
};

function isoDaysAgo(days: number, hour = 14): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function getDemoWallet(): DemoWallet {
  return {
    balance: DEMO_WALLET.balance,
    currency: DEMO_WALLET.currency,
  };
}

export function getDemoUnreadCount(): number {
  return DEMO_UNREAD_COUNT;
}

export function getDemoTransactions(): DemoTransaction[] {
  return DEMO_TRANSACTION_TEMPLATES.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    reason: tx.reason,
    createdAt: isoDaysAgo(tx.daysAgo, tx.hour ?? 14),
    category: null,
    counterpartyUser: tx.counterpartyUser ? { ...tx.counterpartyUser } : null,
  }));
}
