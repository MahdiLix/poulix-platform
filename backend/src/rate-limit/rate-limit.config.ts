import { getAppEnv } from '../config';

export type RateLimitWindow = {
  limit: number;
  ttlMs: number;
};

export type AccountLockoutConfig = {
  maxFailedAttempts: number;
  lockTtlMs: number;
};

export type RateLimitLimits = {
  burst: RateLimitWindow;
  short: RateLimitWindow;
  user: RateLimitWindow;
  login: RateLimitWindow;
  register: RateLimitWindow;
  deposit: RateLimitWindow;
  withdraw: RateLimitWindow;
  transfer: RateLimitWindow;
  payments: RateLimitWindow;
  destinations: RateLimitWindow;
  scheduled: RateLimitWindow;
  securityLimits: RateLimitWindow;
  accountLockout: AccountLockoutConfig;
};

export const RATE_LIMIT_NAMES = {
  burst: 'burst',
  short: 'short',
  user: 'user',
  login: 'login',
  register: 'register',
  deposit: 'deposit',
  withdraw: 'withdraw',
  transfer: 'transfer',
  payments: 'payments',
  destinations: 'destinations',
  scheduled: 'scheduled',
  securityLimits: 'securityLimits',
} as const;

export type RateLimitName =
  (typeof RATE_LIMIT_NAMES)[keyof typeof RATE_LIMIT_NAMES];

export const PRODUCTION_RATE_LIMITS: RateLimitLimits = {
  burst: { limit: 15, ttlMs: 10_000 },

  short: { limit: 60, ttlMs: 60_000 },

  user: { limit: 300, ttlMs: 5 * 60_000 },

  login: { limit: 5, ttlMs: 60_000 },

  register: { limit: 2, ttlMs: 5 * 60_000 },

  deposit: { limit: 3, ttlMs: 60_000 },

  withdraw: { limit: 3, ttlMs: 60_000 },

  transfer: { limit: 5, ttlMs: 60_000 },

  payments: { limit: 3, ttlMs: 60_000 },

  destinations: { limit: 5, ttlMs: 60_000 },

  scheduled: { limit: 5, ttlMs: 60_000 },

  securityLimits: { limit: 5, ttlMs: 60_000 },

  accountLockout: {
    maxFailedAttempts: 5,
    lockTtlMs: 15 * 60_000,
  },
};

export const TEST_RATE_LIMITS: RateLimitLimits = {
  burst: { limit: 5, ttlMs: 10_000 },
  short: { limit: 10, ttlMs: 60_000 },
  user: { limit: 20, ttlMs: 60_000 },
  login: { limit: 3, ttlMs: 10_000 },
  register: { limit: 3, ttlMs: 10_000 },
  deposit: { limit: 3, ttlMs: 60_000 },
  withdraw: { limit: 2, ttlMs: 60_000 },
  transfer: { limit: 2, ttlMs: 60_000 },
  payments: { limit: 2, ttlMs: 10_000 },
  destinations: { limit: 2, ttlMs: 60_000 },
  scheduled: { limit: 2, ttlMs: 60_000 },
  securityLimits: { limit: 2, ttlMs: 60_000 },
  accountLockout: {
    maxFailedAttempts: 3,
    lockTtlMs: 3_000,
  },
};

export function isRateLimitEnabled(): boolean {
  const flag = process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return getAppEnv() === 'production';
}

/** Same counts as TEST_RATE_LIMITS, with login/register/lockout windows a person can hit by hand. */
export const DEVELOPMENT_RATE_LIMITS: RateLimitLimits = {
  ...TEST_RATE_LIMITS,
  login: { limit: 3, ttlMs: 60_000 },
  register: { limit: 3, ttlMs: 60_000 },
  accountLockout: {
    maxFailedAttempts: 3,
    lockTtlMs: 60_000,
  },
};

export function getRateLimitLimits(): RateLimitLimits {
  const env = getAppEnv();
  if (env === 'production') {
    return PRODUCTION_RATE_LIMITS;
  }
  if (env === 'test') {
    return TEST_RATE_LIMITS;
  }
  return DEVELOPMENT_RATE_LIMITS;
}

export function getRateLimitConfig(): RateLimitLimits & { enabled: boolean } {
  return {
    enabled: isRateLimitEnabled(),
    ...getRateLimitLimits(),
  };
}

export function buildRateLimitKey(name: string, identifier: string): string {
  return `rate-limit:${name}:${identifier}`;
}

export function parseRateLimitNameFromKey(key: string): string | undefined {
  if (!key.startsWith('rate-limit:')) {
    return undefined;
  }
  const rest = key.slice('rate-limit:'.length);
  const separator = rest.indexOf(':');
  return separator === -1 ? rest : rest.slice(0, separator);
}
