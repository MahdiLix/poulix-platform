export const DEMO_WALLET = Object.freeze({
  balance: 17_500_000,
  currency: "IRR",
});

export const DEMO_UNREAD_COUNT = 9;

export type DemoTransactionTemplate = {
  id: string;
  type: string;
  amount: number;
  reason: string;
  daysAgo: number;
  hour?: number;
  counterpartyUser?: {
    username: string;
    email: string;
  };
};

export const DEMO_TRANSACTION_TEMPLATES: readonly DemoTransactionTemplate[] =
  Object.freeze([
    {
      id: "demo-tx-withdraw",
      type: "WITHDRAWAL",
      amount: 500_000,
      reason: "Withdraw",
      daysAgo: 1,
      hour: 16,
    },
    {
      id: "demo-tx-send-sara",
      type: "TRANSFER_OUT",
      amount: 700_000,
      reason: "Send to Sara",
      daysAgo: 2,
      hour: 11,
      counterpartyUser: {
        username: "sara",
        email: "sara@example.com",
      },
    },
    {
      id: "demo-tx-top-up",
      type: "DEPOSIT",
      amount: 400_000,
      reason: "Top Up",
      daysAgo: 3,
      hour: 9,
    },
    {
      id: "demo-tx-deposit-week",
      type: "DEPOSIT",
      amount: 2_000_000,
      reason: "Top Up",
      daysAgo: 6,
    },
    {
      id: "demo-tx-transfer-in",
      type: "TRANSFER_IN",
      amount: 1_200_000,
      reason: "Received",
      daysAgo: 12,
      counterpartyUser: {
        username: "sara",
        email: "sara@example.com",
      },
    },
    {
      id: "demo-tx-withdraw-month",
      type: "WITHDRAWAL",
      amount: 300_000,
      reason: "Withdraw",
      daysAgo: 18,
    },
    {
      id: "demo-tx-deposit-month",
      type: "DEPOSIT",
      amount: 1_500_000,
      reason: "Top Up",
      daysAgo: 25,
    },
    {
      id: "demo-tx-send-quarter",
      type: "TRANSFER_OUT",
      amount: 800_000,
      reason: "Send to Sara",
      daysAgo: 42,
      counterpartyUser: {
        username: "sara",
        email: "sara@example.com",
      },
    },
    {
      id: "demo-tx-deposit-quarter",
      type: "DEPOSIT",
      amount: 3_000_000,
      reason: "Top Up",
      daysAgo: 70,
    },
  ]);
