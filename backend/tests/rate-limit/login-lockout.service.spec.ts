import { LoginLockoutService } from '../../src/rate-limit';

describe('LoginLockoutService', () => {
  const originalEnabled = process.env.RATE_LIMIT_ENABLED;

  beforeEach(() => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.APP_ENV = 'test';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.RATE_LIMIT_ENABLED = originalEnabled;
  });

  it('locks after consecutive failures and expires without a restart', async () => {
    const service = new LoginLockoutService();
    await service.recordFailure('user-1');
    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).toBeNull();

    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).toBe(3);
    await expect(service.assertNotLocked('user-1')).rejects.toThrow(
      'Account temporarily locked',
    );

    jest.advanceTimersByTime(3_000);
    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).toBeNull();
    await expect(service.assertNotLocked('user-1')).resolves.toBeUndefined();
  });

  it('resets consecutive failures after a successful login', async () => {
    const service = new LoginLockoutService();
    await service.recordFailure('user-1');
    await service.recordFailure('user-1');
    await service.recordSuccess('user-1');
    await service.recordFailure('user-1');
    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).toBeNull();
    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).not.toBeNull();
  });

  it('keeps separate counters per account', async () => {
    const service = new LoginLockoutService();
    await service.recordFailure('user-1');
    await service.recordFailure('user-1');
    await service.recordFailure('user-1');
    expect(await service.getRetryAfterSeconds('user-1')).not.toBeNull();
    expect(await service.getRetryAfterSeconds('user-2')).toBeNull();
  });
});
