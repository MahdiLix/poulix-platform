import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import {
  isRateLimitEnabled,
  parseRateLimitNameFromKey,
} from './rate-limit.config';
import { getRequest, isGetDepositCallback } from './rate-limit.tracker';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    if (!isRateLimitEnabled()) {
      return true;
    }
    return isGetDepositCallback(getRequest(context));
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(Number(throttlerLimitDetail.timeToBlockExpire) || 1),
    );
    res.header('Retry-After', String(retryAfterSeconds));

    const name = parseRateLimitNameFromKey(throttlerLimitDetail.key);
    if (name) {
      res.header('X-RateLimit-Name', name);
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'RATE_LIMIT_EXCEEDED',
        message: await this.getErrorMessage(context, throttlerLimitDetail),
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
