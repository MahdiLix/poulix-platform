import { describe, expect, it } from "vitest";
import { en } from "@/shared/i18n/messages/en";
import { fa } from "@/shared/i18n/messages/fa";
import { formatDisplayDate, monthLabel } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  transactionReasonLabel,
  transactionTypeLabel,
} from "@/features/wallet/lib/transactionDisplay";

describe("localized formatting", () => {
  it("always formats numeric output with Latin digits", () => {
    expect(formatIrr(1234567, "IRR", "fa")).toBe("1,234,567 IRR");
    expect(formatDisplayDate("2026-09-06T00:00:00Z", "fa")).not.toMatch(
      /[۰-۹]/,
    );
  });

  it("parses comma-formatted payment amounts into raw integers", () => {
    expect(parseAmount("1,000,000")).toBe(1_000_000);
    expect(parseAmount("۵۰,۰۰۰")).toBe(50_000);
    expect(parseAmount("10,000")).toBe(10_000);
  });

  it("keeps display grouping after parsing formatted payment amounts", () => {
    expect(formatIrr("1,000,000", "IRR")).toBe("1,000,000 IRR");
    expect(formatIrr(1_000_000, "IRR")).toBe("1,000,000 IRR");
  });

  it("uses Intl calendar month names", () => {
    expect(monthLabel(1, "en")).toBe("Jan");
    expect(monthLabel(1, "fa")).toBeTruthy();
    expect(monthLabel(1, "fa")).not.toBe("1");
  });

  it("hides unknown raw errors behind the generic fallback", () => {
    expect(localizeError(new Error("internal database detail"), en.messages)).toBe(
      en.messages.genericError,
    );
  });

  it("localizes transaction types and generated reasons", () => {
    expect(transactionTypeLabel("TRANSFER_OUT", fa)).toBe(
      fa.transaction.types.TRANSFER_OUT,
    );
    expect(transactionReasonLabel("Goal contribution: Laptop", fa)).toBe(
      `${fa.transaction.reasons.goalContribution}: Laptop`,
    );
  });
});
