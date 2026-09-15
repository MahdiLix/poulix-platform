import {
  Module,
  Injectable,
  Inject,
  Optional,
  OnModuleDestroy,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { RedisClientType } from 'redis';
import { LoginLockoutService } from './login-lockout.service';
import { AppThrottlerGuard } from './rate-limit.guard';
import { createThrottlerModuleOptions } from './rate-limit.options';
import { RATE_LIMIT_REDIS, createRateLimitRedis } from './rate-limit.redis';
import { RedisThrottlerStorage } from './rate-limit.redis-storage';

@Injectable()
class RateLimitRedisShutdown implements OnModuleDestroy {
  constructor(
    @Optional()
    @Inject(RATE_LIMIT_REDIS)
    private readonly redis: RedisClientType | null,
  ) {}

  async onModuleDestroy() {
    if (this.redis?.isOpen) {
      await this.redis.quit();
    }
  }
}

@Module({
  providers: [
    {
      provide: RATE_LIMIT_REDIS,
      useFactory: createRateLimitRedis,
    },
  ],
  exports: [RATE_LIMIT_REDIS],
})
class RateLimitRedisModule {}

@Module({
  imports: [
    RateLimitRedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitRedisModule],
      inject: [RATE_LIMIT_REDIS],
      useFactory: (redis: RedisClientType | null) => ({
        ...createThrottlerModuleOptions(),
        ...(redis ? { storage: new RedisThrottlerStorage(redis) } : {}),
      }),
    }),
  ],
  providers: [
    LoginLockoutService,
    RateLimitRedisShutdown,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
  exports: [LoginLockoutService, ThrottlerModule],
})
export class RateLimitModule {}
