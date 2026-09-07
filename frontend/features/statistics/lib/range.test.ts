import { describe, expect, it } from "vitest";
import {
  filterByDayRange,
  percentChange,
  previousDayRange,
} from "@/features/statistics/lib/range";

const now = new Date("2026-09-06T12:00:00.000Z");
const records = [
  { id: "today", createdAt: "2026-09-06T08:00:00.000Z" },
  { id: "six-days", createdAt: "2026-08-31T08:00:00.000Z" },
  { id: "seven-days", createdAt: "2026-08-30T08:00:00.000Z" },
  { id: "previous", createdAt: "2026-08-29T08:00:00.000Z" },
];

describe("statistics ranges", () => {
  it("limits the active range by createdAt", () => {
    expect(filterByDayRange(records, 7, now).map((row) => row.id)).toEqual([
      "today",
      "six-days",
    ]);
  });

  it("selects the immediately preceding range", () => {
    expect(previousDayRange(records, 7, now).map((row) => row.id)).toEqual([
      "seven-days",
      "previous",
    ]);
  });

  it("computes a real comparison percentage", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(0, 0)).toBeUndefined();
  });
});
