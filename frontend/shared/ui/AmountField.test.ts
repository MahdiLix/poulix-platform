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

  it("strips grouping separators so display formatting does not change the stored digits", () => {
    expect(formatAmountInput("1,000,000")).toBe("1,000,000");
    expect(formatAmountInput("10,000,000")).toBe("10,000,000");
  });
});
