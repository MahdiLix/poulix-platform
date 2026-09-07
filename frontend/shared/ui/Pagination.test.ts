import { describe, expect, it } from "vitest";
import { getPaginationItems } from "@/shared/ui/Pagination";

describe("getPaginationItems", () => {
  it("centers large page ranges around the current page", () => {
    expect(getPaginationItems(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });
});
