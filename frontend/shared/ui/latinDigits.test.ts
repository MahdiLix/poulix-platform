import { describe, expect, it } from "vitest";
import { toLatinDigits } from "@/shared/ui/latinDigits";
import {
  applyOfferPercent,
  getNormalizedOffer,
} from "@/features/offers/lib/offers";

describe("toLatinDigits", () => {
  it("converts Persian digits used in Top Up amounts", () => {
    expect(toLatinDigits("۵۰۰۰۰")).toBe("50000");
  });

  it("converts Arabic-Indic digits", () => {
    expect(toLatinDigits("٥٠٠٠٠")).toBe("50000");
  });
});

describe("localizeDigits", () => {
  it("keeps output digits Latin for fa", async () => {
    const { localizeDigits } = await import("@/shared/ui/latinDigits");
    expect(localizeDigits("10000", "fa")).toBe("10000");
  });
});

describe("homepage offers", () => {
  it("normalizes the bonus percent", () => {
    expect(
      getNormalizedOffer({
        title: "Special Offer for Today's Top Up",
        description: "Get up to 20% bonus cashback on your next wallet top up.",
        percent: 20.4,
        enabled: true,
      }).percent,
    ).toBe(20);
  });

  it("applies cashback to the next top up amount", () => {
    expect(applyOfferPercent(100000, 20)).toBe(20000);
  });
});
