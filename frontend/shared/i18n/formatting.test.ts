import { describe, expect, it } from "vitest";
import { en } from "@/shared/i18n/messages/en";
import { fa } from "@/shared/i18n/messages/fa";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatScheduleDate,
  monthLabel,
  startOfDayIso,
} from "@/shared/i18n/dates";
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

  it("treats date-only values as local calendar days, not UTC midnight", () => {
    expect(formatDisplayDate("2026-09-16", "en")).toBe(
      formatDisplayDate(new Date(2026, 8, 16), "en"),
    );
    expect(formatDisplayDate("2026-09-16", "fa")).toBe(
      formatDisplayDate(new Date(2026, 8, 16), "fa"),
    );
  });

  it("stores selected calendar days at UTC midnight for scheduling", () => {
    expect(startOfDayIso("2026-09-16")).toBe("2026-09-16T00:00:00.000Z");
    expect(startOfDayIso(" 2026-01-31 ")).toBe("2026-01-31T00:00:00.000Z");
  });

  it("formats the same scheduled instant in either language without changing it", () => {
    const scheduledAt = "2026-09-16T14:45:00.000Z";
    expect(formatDisplayDateTime(scheduledAt, "en")).toBeTruthy();
    expect(formatDisplayDateTime(scheduledAt, "fa")).toBeTruthy();
    expect(scheduledAt).toBe("2026-09-16T14:45:00.000Z");
  });

  it("uses the same calendar day for date-only and stored schedule values", () => {
    expect(formatScheduleDate("2026-09-16", "en")).toBe(
      formatScheduleDate("2026-09-16T00:00:00.000Z", "en"),
    );
    expect(formatScheduleDate("2026-09-16", "fa")).toBe(
      formatScheduleDate("2026-09-16T00:00:00.000Z", "fa"),
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
    expect(
      localizeError(new Error("internal database detail"), en.messages),
    ).toBe(en.messages.genericError);
  });

  it("maps spending-limit and financial-lockout errors to distinct messages", () => {
    expect(
      localizeError(new Error("Spending limit exceeded"), en.messages),
    ).toBe(en.messages.spendingLimitExceeded);
    expect(
      localizeError(
        new Error("Too many failed financial attempts"),
        en.messages,
      ),
    ).toBe(en.messages.tooManyFailedFinancialAttempts);
    expect(
      localizeError(
        new Error("Provide exactly one account number or Shaba number"),
        en.messages,
      ),
    ).toBe(en.messages.provideExactlyOneDestination);
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
