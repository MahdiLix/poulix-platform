import { describe, expect, it } from "vitest";
import { collectWithdrawDestinationValues } from "./withdraw";

describe("saved withdrawal destinations", () => {
  it("separates revealed account and Shaba values for autofill", () => {
    expect(
      collectWithdrawDestinationValues([
        { type: "BANK_ACCOUNT", accountNumber: "1234567890" },
        { type: "SHABA", shabaNumber: `IR${"1".repeat(24)}` },
        { type: "BANK_ACCOUNT", accountNumber: "1234567890" },
        null,
      ]),
    ).toEqual({
      accounts: ["1234567890"],
      shabas: [`IR${"1".repeat(24)}`],
    });
  });
});
