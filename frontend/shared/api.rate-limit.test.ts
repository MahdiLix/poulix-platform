import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiRequestError } from "./api";
import {
  clearAuthCooldowns,
  getRateLimitState,
  setRateLimitCooldown,
} from "./rate-limit/store";
import { RATE_LIMIT_EVENT } from "./rate-limit/types";

function rateLimitedResponse(name: string, retryAfter = 10) {
  return new Response(
    JSON.stringify({
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests",
      retryAfterSeconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Name": name,
      },
    },
  );
}

describe("API rate-limit observation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuthCooldowns({ clearGlobal: true });
    sessionStorage.removeItem("poulix_rl_until");
  });

  it("does not turn a background session-probe 429 into global state", async () => {
    const events: Event[] = [];
    const onRateLimit = (event: Event) => events.push(event);
    window.addEventListener(RATE_LIMIT_EVENT, onRateLimit);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(rateLimitedResponse("burst")),
    );

    await expect(api.getMe()).rejects.toMatchObject<ApiRequestError>({
      status: 429,
    });

    window.removeEventListener(RATE_LIMIT_EVENT, onRateLimit);
    expect(events).toHaveLength(0);
    expect(getRateLimitState().globalUntil).toBe(0);
  });

  it("continues to apply the configured login cooldown on login 429s", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(rateLimitedResponse("login")),
    );

    await expect(
      api.login({ identifier: "sara", password: "invalid-password" }),
    ).rejects.toMatchObject<ApiRequestError>({ status: 429 });

    expect(getRateLimitState().actions.login).toBeGreaterThan(Date.now());
  });

  it("clears a stale pre-authentication global cooldown on successful login", async () => {
    setRateLimitCooldown("global", 30);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: "user-1", email: "sara@poulix.test" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await api.login({ identifier: "sara", password: "valid-password" });

    expect(getRateLimitState().globalUntil).toBe(0);
  });
});
