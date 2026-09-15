import { Logger } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { isRateLimitEnabled } from './rate-limit.config';

export const RATE_LIMIT_REDIS = 'RATE_LIMIT_REDIS';

const logger = new Logger('RateLimitRedis');

export async function createRateLimitRedis(): Promise<RedisClientType | null> {
  if (!isRateLimitEnabled()) {
    return null;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }

  const client: RedisClientType = createClient({
    url,
    socket: {
      reconnectStrategy: false,
    },
  });
  client.on('error', (error) => {
    logger.warn(`Redis error: ${error.message}`);
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.warn(
      `Redis unavailable (${error instanceof Error ? error.message : 'error'}); using in-memory rate-limit storage`,
    );
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch {
      // ignore shutdown errors during fallback
    }
    return null;
  }
}
