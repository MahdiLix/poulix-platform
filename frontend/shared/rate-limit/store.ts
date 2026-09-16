import type { RateLimitInfo } from "./types";
import {
  RATE_LIMIT_EVENT,
  isAuthRateLimitAction,
  isGlobalRateLimitName,
  type RateLimitAction,
  type RateLimitEventDetail,
} from "./types";
import { nearLimitThreshold } from "./parseHeaders";

type ActionState = Partial<Record<RateLimitAction, number>>;

type RateLimitState = {
  globalUntil: number;
  lockoutUntil: number;
  actions: ActionState;
};

const idleState: RateLimitState = {
  globalUntil: 0,
  lockoutUntil: 0,
  actions: {},
};

let state: RateLimitState = idleState;
let epoch = 0;
let quotas: Partial<
  Record<RateLimitAction, Pick<RateLimitInfo, "remaining" | "limit">>
> = {};
const listeners = new Set<() => void>();
const warnedNearLimit = new Map<string, number>();
const expiryTimers = new Map<string, number>();

const STORAGE_KEY = "poulix_rl_until";

function persist() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      globalUntil: state.globalUntil,
      lockoutUntil: state.lockoutUntil,
      actions: state.actions,
    }),
  );
}

function hydrateFromSession() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as RateLimitState;
    const now = Date.now();
    const actions: ActionState = {};
    for (const [action, until] of Object.entries(parsed.actions ?? {}) as Array<
      [RateLimitAction, number]
    >) {
      if (typeof until === "number" && until > now) {
        actions[action] = until;
      }
    }
    const globalUntil =
      typeof parsed.globalUntil === "number" && parsed.globalUntil > now
        ? parsed.globalUntil
        : 0;
    const lockoutUntil =
      typeof parsed.lockoutUntil === "number" && parsed.lockoutUntil > now
        ? parsed.lockoutUntil
        : 0;
    state = { globalUntil, lockoutUntil, actions };
    for (const [action, until] of Object.entries(actions) as Array<
      [RateLimitAction, number]
    >) {
      armExpiry(action, until);
    }
    if (globalUntil) armExpiry("global", globalUntil);
    if (lockoutUntil) armExpiry("lockout", lockoutUntil);
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

function emit() {
  epoch += 1;
  persist();
  listeners.forEach((listener) => listener());
}

function dispatch(detail: RateLimitEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RateLimitEventDetail>(RATE_LIMIT_EVENT, { detail }),
  );
}

function armExpiry(key: string, until: number) {
  if (typeof window === "undefined") return;
  const previous = expiryTimers.get(key);
  if (previous) window.clearTimeout(previous);
  const delay = Math.max(0, until - Date.now());
  expiryTimers.set(
    key,
    window.setTimeout(() => {
      expiryTimers.delete(key);
      expireKeyedCooldown(key);
    }, delay),
  );
}

function markWarningExhausted(name: string) {
  warnedNearLimit.set(name, 0);
}

function expireKeyedCooldown(key: string) {
  const now = Date.now();
  if (key === "global" && state.globalUntil > 0) {
    clearExpiredCooldowns(Math.max(now, state.globalUntil));
    return;
  }
  if (key === "lockout" && state.lockoutUntil > 0) {
    clearExpiredCooldowns(Math.max(now, state.lockoutUntil));
    return;
  }
  const until = state.actions[key as RateLimitAction] ?? 0;
  if (until > 0) {
    clearExpiredCooldowns(Math.max(now, until));
  }
}

export function subscribeRateLimit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRateLimitEpoch() {
  return epoch;
}

export function getRateLimitState(): RateLimitState {
  return state;
}

export function remainingSeconds(until: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function getGlobalCooldownRemaining(now = Date.now()): number {
  return remainingSeconds(state.globalUntil, now);
}

export function getActionCooldownRemaining(
  action: RateLimitAction,
  now = Date.now(),
): number {
  return remainingSeconds(state.actions[action] ?? 0, now);
}

export function getLockoutCooldownRemaining(now = Date.now()): number {
  return remainingSeconds(state.lockoutUntil, now);
}

export function setLockoutCooldown(
  retryAfterSeconds: number,
  now = Date.now(),
) {
  const until = now + Math.max(1, retryAfterSeconds) * 1000;
  const alreadyActive = state.lockoutUntil > now;
  state = {
    ...state,
    lockoutUntil: alreadyActive ? Math.max(state.lockoutUntil, until) : until,
  };
  armExpiry("lockout", state.lockoutUntil);
  emit();
  return alreadyActive;
}

export function recordActionQuota(
  action: RateLimitAction,
  quota: Pick<RateLimitInfo, "remaining" | "limit">,
) {
  quotas = { ...quotas, [action]: quota };
  emit();
}

export function getActionQuota(action: RateLimitAction) {
  return quotas[action];
}

export function setRateLimitCooldown(
  action: RateLimitAction | "global",
  retryAfterSeconds: number,
  now = Date.now(),
) {
  const until = now + Math.max(1, retryAfterSeconds) * 1000;
  if (action === "global") {
    const alreadyActive = state.globalUntil > now;
    state = {
      ...state,
      globalUntil: alreadyActive ? Math.max(state.globalUntil, until) : until,
    };
    armExpiry("global", state.globalUntil);
    emit();
    return alreadyActive;
  }

  const alreadyActive = (state.actions[action] ?? 0) > now;
  const nextUntil = alreadyActive
    ? Math.max(state.actions[action] ?? until, until)
    : until;
  state = {
    ...state,
    actions: {
      ...state.actions,
      [action]: nextUntil,
    },
  };
  armExpiry(action, state.actions[action] ?? until);
  emit();
  return alreadyActive;
}

export function clearExpiredCooldowns(
  now = Date.now(),
): Array<RateLimitAction | "global"> {
  const cleared: Array<RateLimitAction | "global"> = [];
  const actions = { ...state.actions };
  let globalUntil = state.globalUntil;
  let lockoutUntil = state.lockoutUntil;
  let lockoutExpired = false;

  if (globalUntil > 0 && globalUntil <= now) {
    globalUntil = 0;
    cleared.push("global");
  }

  if (lockoutUntil > 0 && lockoutUntil <= now) {
    lockoutUntil = 0;
    lockoutExpired = true;
  }

  for (const [action, until] of Object.entries(actions) as Array<
    [RateLimitAction, number]
  >) {
    if (until <= now) {
      delete actions[action];
      cleared.push(action);
    }
  }

  if (cleared.length > 0 || lockoutExpired) {
    state = { globalUntil, lockoutUntil, actions };
    emit();
    for (const action of cleared) {
      markWarningExhausted(action);
      dispatch({ type: "expired", action });
    }
    if (lockoutExpired) {
      markWarningExhausted("lockout");
      // Lockout only ever applies to the login action (see useRateLimitAction),
      // so "login" is the correct action to report here, not a stand-in fallback.
      dispatch({ type: "expired", action: "login" });
    }
  }

  return cleared;
}

export function clearAuthCooldowns({
  clearGlobal = false,
}: {
  clearGlobal?: boolean;
} = {}) {
  const actions = { ...state.actions };
  delete actions.login;
  delete actions.register;
  const nextQuotas = { ...quotas };
  delete nextQuotas.login;
  delete nextQuotas.register;
  quotas = nextQuotas;
  warnedNearLimit.delete("login");
  warnedNearLimit.delete("register");
  warnedNearLimit.delete("lockout");
  if (typeof window !== "undefined") {
    const loginTimer = expiryTimers.get("login");
    const registerTimer = expiryTimers.get("register");
    const lockoutTimer = expiryTimers.get("lockout");
    const globalTimer = clearGlobal ? expiryTimers.get("global") : undefined;
    if (loginTimer) window.clearTimeout(loginTimer);
    if (registerTimer) window.clearTimeout(registerTimer);
    if (lockoutTimer) window.clearTimeout(lockoutTimer);
    if (globalTimer) window.clearTimeout(globalTimer);
    expiryTimers.delete("login");
    expiryTimers.delete("register");
    expiryTimers.delete("lockout");
    if (clearGlobal) expiryTimers.delete("global");
  }
  state = {
    globalUntil: clearGlobal ? 0 : state.globalUntil,
    lockoutUntil: 0,
    actions,
  };
  emit();
}

export function shouldWarnOnce(
  name: string,
  remaining: number,
  limit: number,
): boolean {
  if (isGlobalRateLimitName(name)) {
    return false;
  }

  const threshold = nearLimitThreshold(limit);

  if (remaining <= 0) {
    warnedNearLimit.set(name, 0);
    return false;
  }

  if (remaining > threshold) {
    warnedNearLimit.set(name, remaining);
    return false;
  }

  const previous = warnedNearLimit.get(name);
  const crossedIntoWarning = previous !== undefined && previous > threshold;
  warnedNearLimit.set(name, remaining);
  return crossedIntoWarning;
}

let lastReadExceededAt = 0;

export function notifyRateLimit(detail: RateLimitEventDetail) {
  if (detail.type === "exceeded") {
    const applyCooldown = detail.applyCooldown !== false;
    let alreadyActive = false;
    if (detail.name === "lockout") {
      alreadyActive = setLockoutCooldown(detail.retryAfter);
    } else if (applyCooldown) {
      alreadyActive = setRateLimitCooldown(detail.action, detail.retryAfter);
    } else {
      const now = Date.now();
      alreadyActive = now - lastReadExceededAt < 4000;
      if (!alreadyActive) {
        lastReadExceededAt = now;
      }
    }
    dispatch({ ...detail, alreadyActive });
    return;
  }
  dispatch(detail);
}

export function resolveExceededAction(
  name: string,
  endpointAction?: RateLimitAction,
): RateLimitAction | "global" {
  if (endpointAction && isAuthRateLimitAction(endpointAction)) {
    return endpointAction;
  }
  if (name === "payments") {
    return "deposit";
  }
  if (isGlobalRateLimitName(name) || name === "default") {
    return "global";
  }
  return endpointAction ?? "global";
}

hydrateFromSession();
