import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const REQUEST_ID_PATTERN = /^[\w.:-]{8,128}$/;

export type RequestWithId = IncomingMessage & { id?: unknown };

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

export function incomingRequestId(
  headers: IncomingMessage['headers'],
): string | undefined {
  const raw = headers['x-request-id'] ?? headers['x-correlation-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === 'string' ? value.trim() : undefined;
  return isValidRequestId(trimmed) ? trimmed : undefined;
}

export function ensureRequestId(
  request: RequestWithId,
  response?: ServerResponse,
): string {
  const id =
    (isValidRequestId(request.id) ? request.id : undefined) ??
    incomingRequestId(request.headers) ??
    randomUUID();

  request.id = id;

  if (response && !response.headersSent) {
    response.setHeader('x-request-id', id);
  }

  return id;
}
