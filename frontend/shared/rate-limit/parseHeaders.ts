import {
  isGlobalRateLimitName,
  type RateLimitAction,
  type RateLimitInfo,
} from "./types";

export function actionFromEndpoint(
  endpoint: string,
  method = "GET",
): RateLimitAction | undefined {
  const path = endpoint.split("?")[0].replace(/^\/api/, "");
  const verb = method.toUpperCase();

  if (verb === "POST" && path === "/auth/login") return "login";
  if (verb === "POST" && path === "/auth/register") return "register";
  if (verb === "POST" && path === "/wallets/deposit") return "deposit";
  if (verb === "POST" && path === "/wallets/withdraw") return "withdraw";
  if (verb === "POST" && path === "/wallets/transfer") return "transfer";
  if (verb !== "GET" && path.startsWith("/scheduled-payments"))
    return "scheduled";
  if (
    (verb === "POST" || verb === "PATCH" || verb === "DELETE") &&
    path.startsWith("/financial-destinations/saved")
  ) {
    return "destinations";
  }
  if ((verb === "PUT" || verb === "PATCH") && path === "/spending-limits") {
    return "securityLimits";
  }
  return undefined;
}

export function parseRetryAfter(headers: Headers): number | undefined {
  const raw =
    headers.get("retry-after") ||
    headers.get("Retry-After") ||
    namedHeader(headers, "retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.ceil(seconds);
}

export function parseRateLimitName(headers: Headers): string | undefined {
  return (
    headers.get("x-ratelimit-name") ||
    headers.get("X-RateLimit-Name") ||
    undefined
  );
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo[] {
  const collected = new Map<string, Partial<RateLimitInfo>>();

  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    const remaining = /^x-ratelimit-remaining(?:-(.+))?$/.exec(lower);
    const limit = /^x-ratelimit-limit(?:-(.+))?$/.exec(lower);
    const reset = /^x-ratelimit-reset(?:-(.+))?$/.exec(lower);
    const name = remaining?.[1] || limit?.[1] || reset?.[1] || "default";
    const entry = collected.get(name) ?? { name };
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    if (remaining) entry.remaining = numeric;
    if (limit) entry.limit = numeric;
    if (reset) entry.reset = numeric;
    collected.set(name, entry);
  });

  return [...collected.values()].filter(
    (item): item is RateLimitInfo =>
      typeof item.name === "string" &&
      typeof item.limit === "number" &&
      typeof item.remaining === "number" &&
      item.limit > 0,
  );
}

export function limitersForAction(
  infos: RateLimitInfo[],
  action: RateLimitAction,
): RateLimitInfo[] {
  const matching = infos.filter(
    (info) =>
      info.name === action ||
      (action === "deposit" && info.name === "payments"),
  );
  if (matching.length > 0) {
    return matching;
  }
  return infos.filter((info) => info.name === "default");
}

export function nearestRateLimit(
  infos: RateLimitInfo[],
): RateLimitInfo | undefined {
  const close = infos
    .filter((info) => !isGlobalRateLimitName(info.name))
    .filter((info) => info.remaining > 0 && info.remaining < info.limit)
    .filter((info) => info.remaining <= nearLimitThreshold(info.limit))
    .sort((a, b) => a.remaining / a.limit - b.remaining / b.limit);
  return close[0];
}

export function nearLimitThreshold(limit: number): number {
  return Math.max(1, Math.floor(limit * 0.1));
}

function namedHeader(headers: Headers, prefix: string): string | null {
  let found: string | null = null;
  headers.forEach((value, key) => {
    if (found) return;
    if (key.toLowerCase().startsWith(`${prefix}-`)) found = value;
  });
  return found;
}
