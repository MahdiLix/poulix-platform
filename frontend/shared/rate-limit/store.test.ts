import { afterEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_EVENT } from "./types";
import {
  clearAuthCooldowns,
  clearExpiredCooldowns,
  getLockoutCooldownRemaining,
  getRateLimitState,
  setLockoutCooldown,
  setRateLimitCooldown,
  shouldWarnOnce,
} from "./store";

describe("rate-limit store persistence", () => {
  afterEach(() => {
    clearAuthCooldowns();
    sessionStorage.removeItem("poulix_rl_until");
  });

  it("stores lockout until timestamps from the backend retry window", () => {
    const before = Date.now();
    setLockoutCooldown(55, before);
    const stored = JSON.parse(
      sessionStorage.getItem("poulix_rl_until") ?? "{}",
    );
    expect(stored.lockoutUntil).toBe(before + 55_000);
    expect(getLockoutCooldownRemaining(before)).toBe(55);
  });

  it("does not extend an active lockout when the same retryAfter is applied again", () => {
    const started = Date.now();
    setLockoutCooldown(60, started);
    const first = getRateLimitState().lockoutUntil;
    setLockoutCooldown(60, started + 2000);
    expect(getRateLimitState().lockoutUntil).toBe(first);
  });

  it("dispatches one expired notification when a cooldown ends", () => {
    const types: string[] = [];
    function onEvent(event: Event) {
      types.push((event as CustomEvent<{ type: string }>).detail.type);
    }
    window.addEventListener(RATE_LIMIT_EVENT, onEvent);
    const started = Date.now();
    setRateLimitCooldown("deposit", 2, started);
    clearExpiredCooldowns(started + 2000);
    window.removeEventListener(RATE_LIMIT_EVENT, onEvent);
    expect(types.filter((type) => type === "expired")).toEqual(["expired"]);
  });

  it("does not treat the first request after expiry as a new warning", () => {
    expect(shouldWarnOnce("withdraw", 2, 2)).toBe(false);
    expect(shouldWarnOnce("withdraw", 1, 2)).toBe(true);
    const started = Date.now();
    setRateLimitCooldown("withdraw", 2, started);
    clearExpiredCooldowns(started + 2000);
    expect(shouldWarnOnce("withdraw", 1, 2)).toBe(false);
  });
});
