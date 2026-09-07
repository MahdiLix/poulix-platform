import { describe, expect, it } from "vitest";
import { fa } from "@/shared/i18n/messages/fa";
import { en } from "@/shared/i18n/messages/en";
import {
  transactionReasonLabel,
  transactionTypeLabel,
} from "@/features/wallet/lib/transactionDisplay";

describe("transaction display labels", () => {
  it("translates operation reasons in Persian", () => {
    expect(transactionReasonLabel("Goal contribution: Laptop", fa)).toBe(
      "واریز به هدف: Laptop",
    );
    expect(transactionReasonLabel("Family support", fa)).toBe("حمایت خانواده");
    expect(transactionReasonLabel("RENT", fa)).toBe("اجاره");
    expect(transactionTypeLabel("TRANSFER_OUT", fa)).toBe("انتقال ارسال‌شده");
  });

  it("keeps English operation labels when English is active", () => {
    expect(transactionReasonLabel("Goal contribution: Laptop", en)).toBe(
      "Goal contribution: Laptop",
    );
    expect(transactionReasonLabel("Family support", en)).toBe("Family support");
  });
});
