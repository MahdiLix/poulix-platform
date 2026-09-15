import { describe, expect, it } from "vitest";
import { toLatinDigits, toRawAmountDigits } from "@/shared/ui/latinDigits";
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

describe("toRawAmountDigits", () => {
  it("removes thousand separators before payment values are processed", () => {
    expect(toRawAmountDigits("1,000,000")).toBe("1000000");
    expect(toRawAmountDigits("۱۰,۰۰۰")).toBe("10000");
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

  it("localizes default English offer copy for Farsi", async () => {
    const { localizeOfferCopy, DEFAULT_HOMEPAGE_OFFER } =
      await import("@/features/offers/lib/offers");
    const localized = localizeOfferCopy(DEFAULT_HOMEPAGE_OFFER, {
      specialOffer: "پیشنهاد ویژه افزایش موجودی امروز",
      specialOfferDesc:
        "با افزایش موجودی بعدی، تا ۲۰٪ اعتبار هدیه به کیف پول شما اضافه می‌شود.",
    });
    expect(localized.title).toBe("پیشنهاد ویژه افزایش موجودی امروز");
  });
});
