import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../auth/jwt.config';

type RequestLike = {
  ip?: string;
  ips?: string[];
  method?: string;
  path?: string;
  url?: string;
  originalUrl?: string;
  baseUrl?: string;
  route?: { path?: string };
  headers?: Record<string, unknown>;
  socket?: { remoteAddress?: string };
};

const SESSION_COOKIE = 'poulix_session';

let jwtService: JwtService | undefined;

function jwt(): JwtService {
  jwtService ??= new JwtService({ secret: getJwtSecret() });
  return jwtService;
}

function sessionCookieToken(req: RequestLike): string | undefined {
  const raw = req.headers?.cookie;
  const cookie = Array.isArray(raw) ? raw[0] : raw;
  if (typeof cookie !== 'string' || !cookie) {
    return undefined;
  }

  const entry = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) {
    return undefined;
  }

  try {
    return decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}

export function getRequest(context: ExecutionContext): RequestLike {
  return context.switchToHttp().getRequest<RequestLike>();
}

export function getClientIp(req: RequestLike): string {
  if (typeof req.ip === 'string' && req.ip.trim()) {
    return req.ip.trim();
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof forwardedValue === 'string' && forwardedValue.trim()) {
    return forwardedValue.split(',')[0].trim();
  }

  return req.socket?.remoteAddress?.trim() || 'unknown';
}

export function getUserIdFromRequest(req: RequestLike): string | undefined {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  const bearerToken =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;
  // Real browser traffic authenticates via the HttpOnly session cookie, not
  // a Bearer header, so fall back to it for accurate per-user throttling.
  const token = bearerToken ?? sessionCookieToken(req);
  if (!token) {
    return undefined;
  }

  try {
    const payload = jwt().verify<{ sub?: string }>(token);
    return typeof payload.sub === 'string' ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

export function requestPath(req: RequestLike): string {
  const original = String(req.originalUrl ?? req.url ?? '').split('?')[0];
  if (original) {
    return original;
  }

  const routePath = req.route?.path ?? req.path ?? '';
  return `${req.baseUrl ?? ''}${routePath}`;
}

export function isGetDepositCallback(req: RequestLike): boolean {
  return (
    (req.method ?? '').toUpperCase() === 'GET' &&
    requestPath(req) === '/wallets/deposit/callback'
  );
}

export function isPostPath(req: RequestLike, path: string): boolean {
  return (
    (req.method ?? '').toUpperCase() === 'POST' && requestPath(req) === path
  );
}

export function isAuthCredentialPost(req: RequestLike): boolean {
  return isPostPath(req, '/auth/login') || isPostPath(req, '/auth/register');
}

/**
 * Authenticated dashboard/profile reads. Burst/short stay in force for
 * unauthenticated traffic (including unauthenticated GET /wallets/balance
 * used by the dedicated burst tests).
 */
const AUTHENTICATED_LIFECYCLE_GETS = [
  '/users/me',
  '/users/lookup',
  '/wallets/me',
  '/wallets/balance',
  '/transactions',
  '/goals',
  '/envelopes',
  '/notifications',
  '/scheduled-payments',
  '/financial-destinations',
  '/spending-limits',
  '/security/sessions',
  '/security/events',
  '/admin/dashboard',
  '/admin/users',
  '/admin/transactions',
  '/admin/payments',
  '/admin/withdrawals',
  '/admin/security-events',
  '/admin/audit-logs',
];

export function isAuthenticatedLifecycleGet(req: RequestLike): boolean {
  if ((req.method ?? '').toUpperCase() !== 'GET') {
    return false;
  }
  if (!getUserIdFromRequest(req)) {
    return false;
  }
  const path = requestPath(req);
  return AUTHENTICATED_LIFECYCLE_GETS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isAuthenticatedSessionTouch(req: RequestLike): boolean {
  return (
    Boolean(getUserIdFromRequest(req)) && isPostPath(req, '/security/touch')
  );
}

export function isMutatingPath(
  req: RequestLike,
  methods: string[],
  match: (path: string) => boolean,
): boolean {
  return (
    methods.includes((req.method ?? '').toUpperCase()) &&
    match(requestPath(req))
  );
}
