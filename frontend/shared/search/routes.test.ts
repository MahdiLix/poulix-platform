import { describe, expect, it } from "vitest";
import { resolveSearchRoutes } from "@/shared/search/routes";

describe("resolveSearchRoutes", () => {
  it("resolves English and Persian route terms", () => {
    expect(
      resolveSearchRoutes({
        query: "top up",
        language: "en",
        role: "USER",
      })[0]?.href,
    ).toBe("/deposit");
    expect(
      resolveSearchRoutes({
        query: "پس‌انداز",
        language: "fa",
        role: "USER",
      })[0]?.href,
    ).toBe("/goals");
  });

  it("keeps admin routes role and scope aware", () => {
    expect(
      resolveSearchRoutes({
        query: "users",
        language: "en",
        role: "USER",
        scope: "admin",
      }),
    ).toEqual([]);
    expect(
      resolveSearchRoutes({
        query: "users",
        language: "en",
        role: "ADMIN",
        scope: "admin",
      })[0]?.href,
    ).toBe("/admin/users");
  });
});
