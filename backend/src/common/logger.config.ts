import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';

const consoleTransportFile = join(__dirname, 'pino-console.transport.js');

export const loggerParams: Params = {
  pinoHttp: {
    timestamp: stdTimeFunctions.isoTime,
    autoLogging: true,
    quietReqLogger: true,
    redact: {
      paths: ['req.headers.authorization'],
      censor: '[Redacted]',
    },
    serializers: {
      req: (request: IncomingMessage & { id?: string }) => ({
        id: request.id,
        method: request.method,
        url: request.url,
      }),
      res: (response: ServerResponse) => ({
        statusCode: response.statusCode,
      }),
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
        {
          target: 'pino-roll',
          options: {
            file: join(process.cwd(), 'logs', 'http.log'),
            size: '5m',
            mkdir: true,
            limit: { count: 2 },
          },
        },
        ...(existsSync(consoleTransportFile)
          ? [{ target: consoleTransportFile }]
          : []),
      ],
    },
  },
};
