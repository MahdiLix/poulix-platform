import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ensureRequestId,
  incomingRequestId,
  isValidRequestId,
} from '../../src/request-logging/request-id';

describe('request id', () => {
  it('accepts trusted inbound request IDs', () => {
    expect(isValidRequestId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    expect(
      incomingRequestId({
        'x-request-id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      }),
    ).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('rejects unsafe inbound request IDs', () => {
    expect(isValidRequestId('bad id with spaces')).toBe(false);
    expect(incomingRequestId({ 'x-request-id': 'bad id with spaces' })).toBe(
      undefined,
    );
    expect(incomingRequestId({ 'x-request-id': 'short' })).toBe(undefined);
  });

  it('reuses a valid existing request ID and echoes it on the response', () => {
    const headers: Record<string, string> = {};
    const request = {
      headers: {
        'x-request-id': 'corr-id-123456',
      },
    } as unknown as IncomingMessage;
    const response = {
      headersSent: false,
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as unknown as ServerResponse;

    const id = ensureRequestId(request, response);

    expect(id).toBe('corr-id-123456');
    expect(headers['x-request-id']).toBe('corr-id-123456');
  });
});
