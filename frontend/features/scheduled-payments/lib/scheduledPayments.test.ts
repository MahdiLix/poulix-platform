import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  addCalendarWeeks,
} from "@/features/scheduled-payments/lib/scheduledPayments";

describe("scheduled payment calendar math", () => {
  it("keeps weekly recurrences on the same weekday", () => {
    const start = new Date("2026-09-16T14:45:00.000Z");
    expect(addCalendarWeeks(start, 1).toISOString()).toBe(
      "2026-09-23T14:45:00.000Z",
    );
  });

  it("clamps monthly recurrences to the last day of shorter months", () => {
    const start = new Date("2026-01-31T14:45:00.000Z");
    const february = addCalendarMonths(start, 1);
    expect(february.toISOString()).toBe("2026-02-28T14:45:00.000Z");
  });
});
