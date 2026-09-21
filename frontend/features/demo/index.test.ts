import { describe, expect, it } from "vitest";
import { DEMO_UNREAD_COUNT, DEMO_WALLET } from "@/features/demo/data";
import {
  getDemoTransactions,
  getDemoUnreadCount,
  getDemoWallet,
} from "@/features/demo";

describe("demo data module", () => {
  it("returns the guest wallet copy without sharing the frozen source", () => {
    const wallet = getDemoWallet();
    expect(wallet.balance).toBe(17_500_000);
    expect(wallet.currency).toBe("IRR");
    wallet.balance = 1;
    expect(DEMO_WALLET.balance).toBe(17_500_000);
    expect(getDemoWallet().balance).toBe(17_500_000);
  });

  it("includes the required guest activity as copies", () => {
    const first = getDemoTransactions();
    expect(first).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "WITHDRAWAL",
          amount: 500_000,
          reason: "Withdraw",
        }),
        expect.objectContaining({
          type: "TRANSFER_OUT",
          amount: 700_000,
          reason: "Send to Sara",
        }),
        expect.objectContaining({
          type: "DEPOSIT",
          amount: 400_000,
          reason: "Top Up",
        }),
      ]),
    );

    first[0].amount = 1;
    const second = getDemoTransactions();
    expect(second[0].amount).toBe(500_000);
  });

  it("returns the guest-only unread badge count", () => {
    expect(getDemoUnreadCount()).toBe(DEMO_UNREAD_COUNT);
    expect(getDemoUnreadCount()).toBe(9);
  });
});
