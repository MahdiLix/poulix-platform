import type { IncomingMessage, ServerResponse } from 'node:http';
import { loggerParams } from '../../src/request-logging/logger.config';

type PinoHttpOptions = Exclude<
  (typeof loggerParams)['pinoHttp'],
  unknown[] | undefined
>;

const pinoHttp = loggerParams.pinoHttp as PinoHttpOptions;

describe('request logger serializers', () => {
  it('omits bodies, headers, and query strings from request logs', () => {
    const serialized = pinoHttp.serializers?.req?.({
      id: 'req-12345678',
      method: 'POST',
      url: '/auth/login?token=secret',
      headers: {
        authorization: 'Bearer secret',
        cookie: 'refresh=secret',
      },
      body: { password: 'secret', identifier: 'user@example.com' },
      user: { id: 'user-1' },
    } as IncomingMessage);

    expect(serialized).toEqual({
      id: 'req-12345678',
      method: 'POST',
      url: '/auth/login',
    });
    expect(serialized).not.toHaveProperty('headers');
    expect(serialized).not.toHaveProperty('body');
  });

  it('attaches requestId, userId, user agent, and environment', () => {
    const props = pinoHttp.customProps?.(
      {
        id: 'req-12345678',
        method: 'GET',
        url: '/wallets/me',
        headers: { 'user-agent': 'PoulixTest/1.0' },
        user: { id: 'user-1' },
      } as IncomingMessage,
      { statusCode: 200 } as ServerResponse,
    );

    expect(props).toMatchObject({
      requestId: 'req-12345678',
      method: 'GET',
      path: '/wallets/me',
      userId: 'user-1',
      userAgent: 'PoulixTest/1.0',
    });
    expect(props).toHaveProperty('environment');
    expect(['development', 'production', 'test']).toContain(
      (props as { environment?: string }).environment,
    );
    expect(JSON.stringify(props)).not.toMatch(/Bearer|password|cookie/i);
  });
});
