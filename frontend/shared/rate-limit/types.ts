export const GLOBAL_RATE_LIMIT_NAMES = ["burst", "short", "user"] as const;

export type GlobalRateLimitName = (typeof GLOBAL_RATE_LIMIT_NAMES)[number];

export type RateLimitAction =
  | "login"
  | "register"
  | "deposit"
  | "withdraw"
  | "transfer"
  | "scheduled"
  | "destinations"
  | "securityLimits";

export type RateLimitInfo = {
  name: string;
  limit: number;
  remaining: number;
  reset: number;
};

export const RATE_LIMIT_EVENT = "poulix:rate-limit";

export type RateLimitEventDetail =
  | {
      type: "warning";
      name: string;
      remaining: number;
      limit: number;
    }
  | {
      type: "exceeded";
      action: RateLimitAction | "global";
      name: string;
      retryAfter: number;
      alreadyActive?: boolean;
      applyCooldown?: boolean;
    }
  | {
      type: "expired";
      action: RateLimitAction | "global";
    };

export function isGlobalRateLimitName(
  name: string,
): name is GlobalRateLimitName {
  return (GLOBAL_RATE_LIMIT_NAMES as readonly string[]).includes(name);
}

export function isAuthRateLimitAction(action: RateLimitAction): boolean {
  return action === "login" || action === "register";
}
