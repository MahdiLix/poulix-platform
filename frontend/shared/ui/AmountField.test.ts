import { describe, expect, it } from "vitest";
import { formatAmountInput } from "@/shared/ui/AmountField";

describe("AmountField", () => {
  it("groups Latin digits without changing the raw numeric value", () => {
    expect(formatAmountInput("10000000")).toBe("10,000,000");
    expect(formatAmountInput("")).toBe("");
  });

  it("normalizes Persian input digits before formatting", () => {
    expect(formatAmountInput("۱۲۳۴۵۶")).toBe("123,456");
  });
});
