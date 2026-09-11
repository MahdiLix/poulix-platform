import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  clientIp,
  requestUserAgent,
  runWithRequestContext,
} from './request-context';
import { ensureRequestId } from './request-id';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId = ensureRequestId(request, response);

    runWithRequestContext(
      {
        requestId,
        ip: clientIp(request),
        userAgent: requestUserAgent(request),
      },
      () => next(),
    );
  }
}
