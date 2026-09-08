import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';

const consoleTransportFile = join(__dirname, 'pino-console.transport.js');
const httpLogFile = join(process.cwd(), 'logs', 'http.log');

type LoggedRequest = IncomingMessage & {
  id?: string;
  ip?: string;
  user?: { id?: string };
};

function clientIp(request: LoggedRequest): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim();
  }
  return request.ip ?? request.socket?.remoteAddress ?? undefined;
}

export const loggerParams: Params = {
  pinoHttp: {
    timestamp: stdTimeFunctions.isoTime,
    autoLogging: true,
    quietReqLogger: true,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.confirmPassword',
      ],
      censor: '[Redacted]',
    },
    serializers: {
      req: (request: LoggedRequest) => ({
        id: request.id,
        method: request.method,
        url: request.url,
        ip: clientIp(request),
      }),
      res: (response: ServerResponse) => ({
        statusCode: response.statusCode,
      }),
    },
    customProps: (request: LoggedRequest) => {
      const userId = request.user?.id;
      return userId ? { userId } : {};
    },
    customLogLevel: (
      _request: IncomingMessage,
      response: ServerResponse,
      error?: Error,
    ) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      if (response.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
    transport: {
      targets: [
        ...(existsSync(consoleTransportFile)
          ? [
              { target: consoleTransportFile },
              {
                target: consoleTransportFile,
                options: { file: httpLogFile },
              },
            ]
          : [
              {
                target: 'pino-roll',
                options: {
                  file: httpLogFile,
                  size: '5m',
                  mkdir: true,
                  limit: { count: 2 },
                },
              },
            ]),
      ],
    },
  },
};
