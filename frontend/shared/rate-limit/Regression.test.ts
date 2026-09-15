import { afterEach, describe, expect, it } from "vitest";
import {
  clearAuthCooldowns,
  clearExpiredCooldowns,
  setRateLimitCooldown,
  shouldWarnOnce,
} from "./store";

describe("regression: reported notification bugs", () => {
  afterEach(() => {
    clearAuthCooldowns();
    sessionStorage.removeItem("poulix_rl_until");
  });

  it("bug #1: a payments warning is not swallowed just because deposit's cooldown cleared", () => {
    // "payments" and "deposit" are two independently-tracked named limiters
    // that both roll up to the "deposit" action. Record payments as "far
    // from the limit" (no warning yet)...
    expect(shouldWarnOnce("payments", 20, 10)).toBe(false);
    // ...then something unrelated causes the *deposit* action's cooldown to
    // clear (e.g. the user waited out an earlier deposit 429). This must not
    // reach over and corrupt payments' own independently-tracked state.
    const started = Date.now();
    setRateLimitCooldown("deposit", 5, started);
    clearExpiredCooldowns(started + 5000);
    // payments now genuinely dips into the near-limit zone for the first
    // time - it must warn, using its real last-known value (20, far from
    // the limit), not a value zeroed out by deposit's unrelated clear.
    expect(shouldWarnOnce("payments", 1, 10)).toBe(true);
  });

  it("bug #2/#3: two cooldowns clearing at the same moment each get their own expired event", () => {
    const types: Array<{ type: string; action?: string }> = [];
    function onEvent(event: Event) {
      types.push(
        (event as CustomEvent<{ type: string; action?: string }>).detail,
      );
    }
    window.addEventListener("poulix:rate-limit", onEvent);
    const started = Date.now();
    setRateLimitCooldown("withdraw", 3, started);
    setRateLimitCooldown("deposit", 3, started);
    clearExpiredCooldowns(started + 3000);
    window.removeEventListener("poulix:rate-limit", onEvent);

    const expired = types.filter((t) => t.type === "expired");
    expect(expired.length).toBe(2);
  });

  it("bug #4: an unrelated limiter's warned state survives clearAuthCooldowns", () => {
    expect(shouldWarnOnce("scheduled", 10, 10)).toBe(false);
    expect(shouldWarnOnce("scheduled", 1, 10)).toBe(true);
    // Something clears auth cooldowns (e.g. logout / login cooldown cleared).
    clearAuthCooldowns();
    // scheduled's own remaining is unchanged and still in the warn zone, so
    // it must NOT warn again out of nowhere.
    expect(shouldWarnOnce("scheduled", 1, 10)).toBe(false);
  });
});
