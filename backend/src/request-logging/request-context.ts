import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingMessage } from 'node:http';

export type RequestContextStore = {
  requestId?: string;
  ip?: string;
  userAgent?: string;
};

const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(
  store: RequestContextStore,
  next: () => T,
): T {
  return requestContext.run(store, next);
}

export function getRequestContext(): RequestContextStore {
  return requestContext.getStore() ?? {};
}

export function clientIp(request: IncomingMessage & { ip?: string }) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim().slice(0, 45);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim().slice(0, 45);
  }
  return (request.ip ?? request.socket?.remoteAddress)?.slice(0, 45);
}

export function requestUserAgent(request: IncomingMessage) {
  const raw = request.headers['user-agent'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim().slice(0, 200) || undefined;
}
