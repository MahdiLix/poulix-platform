import {
  getRateLimitConfig,
  isRateLimitEnabled,
  DEVELOPMENT_RATE_LIMITS,
  PRODUCTION_RATE_LIMITS,
  TEST_RATE_LIMITS,
} from '../../src/rate-limit';

describe('rate-limit config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is disabled by default in test and development', () => {
    delete process.env.RATE_LIMIT_ENABLED;
    process.env.APP_ENV = 'test';
    expect(isRateLimitEnabled()).toBe(false);

    process.env.APP_ENV = 'development';
    expect(isRateLimitEnabled()).toBe(false);
  });

  it('is enabled in production and when RATE_LIMIT_ENABLED=true', () => {
    delete process.env.RATE_LIMIT_ENABLED;
    process.env.APP_ENV = 'production';
    expect(isRateLimitEnabled()).toBe(true);
    expect(getRateLimitConfig()).toEqual({
      enabled: true,
      ...PRODUCTION_RATE_LIMITS,
    });

    process.env.APP_ENV = 'test';
    process.env.RATE_LIMIT_ENABLED = 'true';
    expect(isRateLimitEnabled()).toBe(true);
    expect(getRateLimitConfig()).toEqual({
      enabled: true,
      ...TEST_RATE_LIMITS,
    });

    process.env.APP_ENV = 'development';
    process.env.RATE_LIMIT_ENABLED = 'true';
    expect(isRateLimitEnabled()).toBe(true);
    expect(getRateLimitConfig()).toEqual({
      enabled: true,
      ...DEVELOPMENT_RATE_LIMITS,
    });
  });

  it('keeps independent production windows', () => {
    expect(PRODUCTION_RATE_LIMITS.burst).toEqual({
      limit: 30,
      ttlMs: 10_000,
    });
    expect(PRODUCTION_RATE_LIMITS.short).toEqual({
      limit: 150,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.user).toEqual({
      limit: 800,
      ttlMs: 5 * 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.login).toEqual({
      limit: 8,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.register).toEqual({
      limit: 3,
      ttlMs: 5 * 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.deposit).toEqual({
      limit: 5,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.withdraw).toEqual({
      limit: 5,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.transfer).toEqual({
      limit: 10,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.payments).toEqual({
      limit: 5,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.destinations).toEqual({
      limit: 10,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.scheduled).toEqual({
      limit: 10,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.securityLimits).toEqual({
      limit: 10,
      ttlMs: 60_000,
    });
    expect(PRODUCTION_RATE_LIMITS.accountLockout).toEqual({
      maxFailedAttempts: 5,
      lockTtlMs: 10 * 60_000,
    });
  });

  it('keeps test windows small and independent', () => {
    expect(TEST_RATE_LIMITS.burst).toEqual({ limit: 5, ttlMs: 10_000 });
    expect(TEST_RATE_LIMITS.short).toEqual({ limit: 10, ttlMs: 60_000 });
    expect(TEST_RATE_LIMITS.user).toEqual({ limit: 20, ttlMs: 60_000 });
    expect(TEST_RATE_LIMITS.login).toEqual({ limit: 3, ttlMs: 10_000 });
    expect(TEST_RATE_LIMITS.register).toEqual({ limit: 3, ttlMs: 10_000 });
    expect(TEST_RATE_LIMITS.payments.limit).toBeLessThan(
      TEST_RATE_LIMITS.deposit.limit,
    );
    expect(TEST_RATE_LIMITS.payments.ttlMs).toBeLessThan(
      TEST_RATE_LIMITS.deposit.ttlMs,
    );
    expect(TEST_RATE_LIMITS.accountLockout).toEqual({
      maxFailedAttempts: 3,
      lockTtlMs: 3_000,
    });
  });
});
