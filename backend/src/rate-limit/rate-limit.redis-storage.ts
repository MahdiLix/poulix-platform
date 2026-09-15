import type { ThrottlerStorage } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  pttl = tonumber(ARGV[1])
end
local blocked = 0
if hits > tonumber(ARGV[2]) then
  blocked = 1
end
return { hits, pttl, blocked }
`;

function secondsFromPttl(pttlMs: number): number {
  return Math.max(1, Math.ceil(pttlMs / 1000));
}

function allowRequest(ttlMs: number): ThrottlerStorageRecord {
  return {
    totalHits: 1,
    timeToExpire: secondsFromPttl(ttlMs),
    isBlocked: false,
    timeToBlockExpire: 0,
  };
}

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisClientType) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlMs = Math.max(1, Math.trunc(ttl) || 1);
    if (!this.redis.isOpen) {
      return allowRequest(ttlMs);
    }

    try {
      const result = (await this.redis.eval(INCREMENT_SCRIPT, {
        keys: [key],
        arguments: [String(ttlMs), String(limit)],
      })) as [number, number, number];

      const totalHits = Number(result[0]);
      const timeToExpire = secondsFromPttl(Number(result[1]));
      const isBlocked = Number(result[2]) === 1;

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    } catch {
      return allowRequest(ttlMs);
    }
  }
}
