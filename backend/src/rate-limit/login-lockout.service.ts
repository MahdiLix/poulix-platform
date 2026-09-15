import {
  Injectable,
  Optional,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { getRateLimitLimits, isRateLimitEnabled } from './rate-limit.config';
import { RATE_LIMIT_REDIS } from './rate-limit.redis';

export class AccountTemporarilyLockedException extends UnauthorizedException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super({
      statusCode: 401,
      error: 'ACCOUNT_LOCKED',
      message: 'Account temporarily locked',
      retryAfterSeconds,
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type LockoutEntry = {
  failures: number;
  lockedUntil?: number;
};

const RECORD_FAILURE_SCRIPT = `
local lockPttl = redis.call('PTTL', KEYS[1])
if lockPttl > 0 then
  return lockPttl
end
local failures = redis.call('INCR', KEYS[2])
if failures == 1 then
  redis.call('PEXPIRE', KEYS[2], ARGV[2])
end
if failures >= tonumber(ARGV[1]) then
  redis.call('SET', KEYS[1], '1', 'PX', ARGV[2])
  redis.call('DEL', KEYS[2])
  return tonumber(ARGV[2])
end
return 0
`;

@Injectable()
export class LoginLockoutService {
  private readonly entries = new Map<string, LockoutEntry>();

  constructor(
    @Optional()
    @Inject(RATE_LIMIT_REDIS)
    private readonly redis: RedisClientType | null = null,
  ) {}

  async getRetryAfterSeconds(
    userId: string,
    now = Date.now(),
  ): Promise<number | null> {
    if (!isRateLimitEnabled()) {
      return null;
    }

    if (this.redis?.isOpen) {
      try {
        const pttl = await this.redis.pTTL(lockKey(userId));
        if (pttl <= 0) {
          if (pttl === -1) {
            await this.redis.del(lockKey(userId));
          }
          return null;
        }
        return secondsFromPttl(pttl);
      } catch {
        return null;
      }
    }

    const entry = this.entries.get(userId);
    if (!entry?.lockedUntil) {
      return null;
    }

    if (entry.lockedUntil <= now) {
      this.entries.delete(userId);
      return null;
    }

    return secondsFromPttl(entry.lockedUntil - now);
  }

  async assertNotLocked(userId: string, now = Date.now()): Promise<void> {
    const retryAfter = await this.getRetryAfterSeconds(userId, now);
    if (retryAfter != null) {
      throw new AccountTemporarilyLockedException(retryAfter);
    }
  }

  async recordFailure(userId: string, now = Date.now()): Promise<void> {
    if (!isRateLimitEnabled()) {
      return;
    }

    const { maxFailedAttempts, lockTtlMs } =
      getRateLimitLimits().accountLockout;

    if (this.redis?.isOpen) {
      try {
        await this.redis.eval(RECORD_FAILURE_SCRIPT, {
          keys: [lockKey(userId), failKey(userId)],
          arguments: [String(maxFailedAttempts), String(lockTtlMs)],
        });
      } catch {
        // Redis must not block login if lockout state cannot be stored.
      }
      return;
    }

    const existing = this.entries.get(userId);

    if (existing?.lockedUntil && existing.lockedUntil > now) {
      return;
    }

    const failures =
      existing?.lockedUntil && existing.lockedUntil <= now
        ? 1
        : (existing?.failures ?? 0) + 1;
    const next: LockoutEntry = { failures };

    if (failures >= maxFailedAttempts) {
      next.lockedUntil = now + lockTtlMs;
    }

    this.entries.set(userId, next);
  }

  async recordSuccess(userId: string): Promise<void> {
    if (this.redis?.isOpen) {
      try {
        await this.redis.del([lockKey(userId), failKey(userId)]);
      } catch {
        // ignore
      }
      return;
    }
    this.entries.delete(userId);
  }
}

function secondsFromPttl(pttlMs: number): number {
  return Math.max(1, Math.ceil(pttlMs / 1000));
}

function failKey(userId: string): string {
  return `lockout:fails:${userId}`;
}

function lockKey(userId: string): string {
  return `lockout:${userId}`;
}
