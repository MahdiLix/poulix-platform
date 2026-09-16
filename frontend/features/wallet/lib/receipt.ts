export type FinancialReceipt = {
  amount: number;
  balance: number;
  currency: string;
  recipient?: string;
  email?: string;
  destination?: string;
  destinationType?: "account" | "shaba";
  reason?: string;
  category?: string;
};

const WITHDRAWAL_RECEIPT_KEY = "poulix_withdrawal_receipt";
const TRANSFER_RECEIPT_KEY = "poulix_transfer_receipt";

function write(key: string, receipt: FinancialReceipt) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(key, JSON.stringify(receipt));
  }
}

function read(key: string): FinancialReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as FinancialReceipt) : null;
  } catch {
    return null;
  }
}

export const saveWithdrawalReceipt = (receipt: FinancialReceipt) =>
  write(WITHDRAWAL_RECEIPT_KEY, receipt);
export const readWithdrawalReceipt = () => read(WITHDRAWAL_RECEIPT_KEY);
export const saveTransferReceipt = (receipt: FinancialReceipt) =>
  write(TRANSFER_RECEIPT_KEY, receipt);
export const readTransferReceipt = () => read(TRANSFER_RECEIPT_KEY);
