import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { getAppEnv, isProductionEnv, isTestEnv } from '../config';
import { clientIp, requestUserAgent } from './request-context';
import { ensureRequestId, type RequestWithId } from './request-id';

const consoleTransportFile = join(__dirname, 'pino-console.transport.js');
const appEnv = getAppEnv();
const isProduction = isProductionEnv();
const isTest = isTestEnv();
// Compiled Docker runners set NODE_ENV=production. Keep JSON stdout there so
// `docker compose logs` stays structured. Pretty output is host-only.
const useJsonStdout =
  isProduction || isTest || process.env.NODE_ENV === 'production';

type LoggedRequest = RequestWithId & {
  ip?: string;
  user?: { id?: string };
  raw?: { user?: { id?: string } };
};

function requestUser(request: LoggedRequest) {
  return request.user ?? request.raw?.user;
}

function requestPath(url: string | undefined): string {
  if (!url) return '';
  const question = url.indexOf('?');
  return question === -1 ? url : url.slice(0, question);
}

function errorInfo(error?: Error) {
  if (!error) {
    return undefined;
  }

  return {
    type: error.name,
    message: error.message,
    ...(!isProduction && error.stack ? { stack: error.stack } : {}),
  };
}

export const loggerParams: Params = {
  pinoHttp: {
    timestamp: stdTimeFunctions.isoTime,
    autoLogging: !isTest,
    quietReqLogger: true,
    genReqId: (request, response) =>
      ensureRequestId(request as RequestWithId, response),
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.confirmPassword',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'req.body.cvv',
        'req.body.cardNumber',
        'req.body.accountNumber',
        'req.body.shabaNumber',
      ],
      censor: '[Redacted]',
    },
    serializers: {
      req: (request: LoggedRequest) => ({
        id: request.id,
        method: request.method,
        url: requestPath(request.url) || request.url,
      }),
      res: (response: ServerResponse) => ({
        statusCode: response.statusCode,
      }),
      err: (error: Error) => ({
        type: error.name,
        message: error.message,
        ...(!isProduction && error.stack ? { stack: error.stack } : {}),
      }),
    },
    customProps: (request: LoggedRequest, _response: ServerResponse) => {
      const user = requestUser(request);
      return {
        requestId: request.id,
        method: request.method,
        path: requestPath(request.url) || request.url,
        ip: clientIp(request),
        userAgent: requestUserAgent(request),
        environment: appEnv,
        ...(user?.id ? { userId: user.id } : {}),
      };
    },
    customErrorMessage: (
      _request: IncomingMessage,
      _response: ServerResponse,
      error: Error,
    ) => error.message,
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
    customErrorObject: (
      _request: IncomingMessage,
      _response: ServerResponse,
      error: Error,
    ) => errorInfo(error),
    ...(useJsonStdout || !existsSync(consoleTransportFile)
      ? {}
      : {
          transport: {
            target: consoleTransportFile,
          },
        }),
  },
};
