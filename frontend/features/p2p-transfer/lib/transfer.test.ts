import { describe, expect, it } from "vitest";
import { validateTransferAmount } from "./transfer";
import { en } from "@/shared/i18n/messages/en";

describe("validateTransferAmount", () => {
  it("rejects an amount that exceeds remaining spending limit", () => {
    expect(
      validateTransferAmount(100_000, 500_000, en.messages, 50_000),
    ).toBe(en.messages.spendingLimitExceeded);
  });
});
