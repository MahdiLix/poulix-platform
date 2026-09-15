import type { ExecutionContext } from '@nestjs/common';
import type {
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from '@nestjs/throttler';
import { isProductionEnv } from '../config';
import {
  buildRateLimitKey,
  getRateLimitLimits,
  RATE_LIMIT_NAMES,
} from './rate-limit.config';
import {
  getClientIp,
  getRequest,
  getUserIdFromRequest,
  isAuthCredentialPost,
  isAuthenticatedLifecycleGet,
  isAuthenticatedSessionTouch,
  isMutatingPath,
  isPostPath,
  requestPath,
} from './rate-limit.tracker';

function skipUnless(
  predicate: (req: ReturnType<typeof getRequest>) => boolean,
): (context: ExecutionContext) => boolean {
  return (context) => !predicate(getRequest(context));
}

function skipUnlessAuthenticated(
  predicate: (req: ReturnType<typeof getRequest>) => boolean,
): (context: ExecutionContext) => boolean {
  return skipUnless(
    (req) => Boolean(getUserIdFromRequest(req)) && predicate(req),
  );
}

function skipBurstAndShort(context: ExecutionContext): boolean {
  const req = getRequest(context);
  return (
    isAuthCredentialPost(req) ||
    isAuthenticatedLifecycleGet(req) ||
    isAuthenticatedSessionTouch(req)
  );
}

export function createThrottlerModuleOptions(): ThrottlerModuleOptions {
  const limits = getRateLimitLimits();

  const ipTracker = (req: Record<string, unknown>) =>
    getClientIp(req as Parameters<typeof getClientIp>[0]);
  const userTracker = (req: Record<string, unknown>) =>
    getUserIdFromRequest(req as Parameters<typeof getUserIdFromRequest>[0]) ??
    getClientIp(req as Parameters<typeof getClientIp>[0]);

  const skipUnlessAuthenticatedDeposit = skipUnlessAuthenticated((req) =>
    isPostPath(req, '/wallets/deposit'),
  );

  const throttlers: ThrottlerOptions[] = [
    {
      name: RATE_LIMIT_NAMES.burst,
      ttl: limits.burst.ttlMs,
      limit: limits.burst.limit,
      getTracker: ipTracker,
      skipIf: skipBurstAndShort,
    },
    {
      name: RATE_LIMIT_NAMES.short,
      ttl: limits.short.ttlMs,
      limit: limits.short.limit,
      getTracker: ipTracker,
      skipIf: skipBurstAndShort,
    },
    {
      name: RATE_LIMIT_NAMES.user,
      ttl: limits.user.ttlMs,
      limit: limits.user.limit,
      getTracker: userTracker,
      skipIf: (context) => {
        const req = getRequest(context);
        if (!getUserIdFromRequest(req)) {
          return true;
        }
        if (isProductionEnv()) {
          return false;
        }
        // Keep GET /wallets/balance on the user layer so dedicated tests can
        // still fill the user window. Other dashboard reads skip it.
        if (
          (req.method ?? '').toUpperCase() === 'GET' &&
          requestPath(req) === '/wallets/balance'
        ) {
          return false;
        }
        return isAuthenticatedLifecycleGet(req);
      },
    },
    {
      name: RATE_LIMIT_NAMES.login,
      ttl: limits.login.ttlMs,
      limit: limits.login.limit,
      getTracker: ipTracker,
      skipIf: skipUnless((req) => isPostPath(req, '/auth/login')),
    },
    {
      name: RATE_LIMIT_NAMES.register,
      ttl: limits.register.ttlMs,
      limit: limits.register.limit,
      getTracker: ipTracker,
      skipIf: skipUnless((req) => isPostPath(req, '/auth/register')),
    },
    {
      name: RATE_LIMIT_NAMES.deposit,
      ttl: limits.deposit.ttlMs,
      limit: limits.deposit.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticatedDeposit,
    },
    {
      // Payment creation is POST /wallets/deposit (PaymentsService.createDeposit).
      name: RATE_LIMIT_NAMES.payments,
      ttl: limits.payments.ttlMs,
      limit: limits.payments.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticatedDeposit,
    },
    {
      name: RATE_LIMIT_NAMES.withdraw,
      ttl: limits.withdraw.ttlMs,
      limit: limits.withdraw.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticated((req) =>
        isPostPath(req, '/wallets/withdraw'),
      ),
    },
    {
      name: RATE_LIMIT_NAMES.transfer,
      ttl: limits.transfer.ttlMs,
      limit: limits.transfer.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticated((req) =>
        isPostPath(req, '/wallets/transfer'),
      ),
    },
    {
      name: RATE_LIMIT_NAMES.destinations,
      ttl: limits.destinations.ttlMs,
      limit: limits.destinations.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticated((req) =>
        isMutatingPath(req, ['POST', 'PATCH', 'DELETE'], (path) =>
          path.startsWith('/financial-destinations/saved'),
        ),
      ),
    },
    {
      name: RATE_LIMIT_NAMES.scheduled,
      ttl: limits.scheduled.ttlMs,
      limit: limits.scheduled.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticated(
        (req) =>
          (req.method ?? '').toUpperCase() !== 'GET' &&
          requestPath(req).startsWith('/scheduled-payments'),
      ),
    },
    {
      name: RATE_LIMIT_NAMES.securityLimits,
      ttl: limits.securityLimits.ttlMs,
      limit: limits.securityLimits.limit,
      getTracker: userTracker,
      skipIf: skipUnlessAuthenticated((req) =>
        isMutatingPath(
          req,
          ['PUT', 'PATCH'],
          (path) => path === '/spending-limits',
        ),
      ),
    },
  ];

  return {
    errorMessage: 'Too many requests',
    getTracker: ipTracker,
    generateKey: (_context, tracker, name) => buildRateLimitKey(name, tracker),
    throttlers,
  };
}
