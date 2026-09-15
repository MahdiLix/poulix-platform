import { afterEach, describe, expect, it } from "vitest";
import {
  limitersForAction,
  nearestRateLimit,
  parseRateLimitHeaders,
  parseRetryAfter,
} from "./parseHeaders";
import {
  clearAuthCooldowns,
  resolveExceededAction,
  shouldWarnOnce,
} from "./store";

function headers(entries: Record<string, string>) {
  return new Headers(entries);
}

describe("rate limit header parsing", () => {
  afterEach(() => {
    clearAuthCooldowns();
    sessionStorage.removeItem("poulix_rl_until");
  });

  it("reads Retry-After and named remaining headers", () => {
    const parsed = parseRateLimitHeaders(
      headers({
        "X-RateLimit-Limit-burst": "30",
        "X-RateLimit-Remaining-burst": "2",
        "X-RateLimit-Reset-burst": "8",
        "Retry-After": "8",
      }),
    );

    expect(parsed).toEqual([
      { name: "burst", limit: 30, remaining: 2, reset: 8 },
    ]);
    expect(parseRetryAfter(headers({ "Retry-After": "8" }))).toBe(8);
  });

  it("warns only when remaining is close to the limit", () => {
    const far = nearestRateLimit([
      { name: "deposit", limit: 30, remaining: 20, reset: 9 },
    ]);
    const close = nearestRateLimit([
      { name: "burst", limit: 30, remaining: 2, reset: 9 },
      { name: "deposit", limit: 5, remaining: 1, reset: 40 },
    ]);

    expect(far).toBeUndefined();
    expect(close?.name).toBe("deposit");
  });

  it("keeps deposit warnings on deposit/payments headers, not burst", () => {
    const infos = [
      { name: "burst", limit: 5, remaining: 1, reset: 8 },
      { name: "payments", limit: 2, remaining: 1, reset: 9 },
      { name: "deposit", limit: 3, remaining: 2, reset: 40 },
    ];

    expect(limitersForAction(infos, "deposit")).toEqual([
      { name: "payments", limit: 2, remaining: 1, reset: 9 },
      { name: "deposit", limit: 3, remaining: 2, reset: 40 },
    ]);
  });

  it("falls back to unprefixed default headers for the current action", () => {
    const infos = [
      { name: "burst", limit: 5, remaining: 1, reset: 8 },
      { name: "default", limit: 2, remaining: 1, reset: 9 },
    ];
    expect(limitersForAction(infos, "withdraw")).toEqual([
      { name: "default", limit: 2, remaining: 1, reset: 9 },
    ]);
  });

  it("maps a payments limiter 429 onto the deposit action", () => {
    expect(resolveExceededAction("payments", "deposit")).toBe("deposit");
    expect(resolveExceededAction("burst", "deposit")).toBe("global");
    expect(resolveExceededAction("burst", "login")).toBe("login");
    expect(resolveExceededAction("login", "login")).toBe("login");
  });

  it("warns once when remaining first crosses into the near-limit zone", () => {
    expect(shouldWarnOnce("deposit-cycle", 5, 5)).toBe(false);
    expect(shouldWarnOnce("deposit-cycle", 1, 5)).toBe(true);
    expect(shouldWarnOnce("deposit-cycle", 1, 5)).toBe(false);
  });

  it("does not warn when the first sample is already in the near-limit zone", () => {
    expect(shouldWarnOnce("payments-first-click", 1, 2)).toBe(false);
    expect(shouldWarnOnce("payments-first-click", 1, 2)).toBe(false);
  });

  it("does not treat remaining 0 as a warning", () => {
    expect(shouldWarnOnce("login-zero", 0, 3)).toBe(false);
  });

  it("does not warn from burst/short/user leftover headers", () => {
    expect(shouldWarnOnce("burst", 1, 5)).toBe(false);
  });

  it("warns when remaining first enters the near-limit zone, not after a cooldown reset", () => {
    expect(shouldWarnOnce("payments-cycle", 2, 2)).toBe(false);
    expect(shouldWarnOnce("payments-cycle", 1, 2)).toBe(true);
    expect(shouldWarnOnce("payments-cycle", 0, 2)).toBe(false);
    expect(shouldWarnOnce("payments-cycle", 1, 2)).toBe(false);
    expect(shouldWarnOnce("payments-cycle", 2, 2)).toBe(false);
    expect(shouldWarnOnce("payments-cycle", 1, 2)).toBe(true);
  });
});
