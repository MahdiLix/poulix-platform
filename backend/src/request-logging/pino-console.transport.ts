import build from 'pino-abstract-transport';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[90m';

const SKIP_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
]);

type HttpLogObject = {
  level?: number;
  time?: string | number;
  context?: string;
  msg?: string;
  responseTime?: number;
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  err?: { type?: string; message?: string };
  req?: { id?: string; method?: string; url?: string };
  res?: { statusCode?: number };
};

function colorFor(level: number, statusCode?: number): string {
  if (level >= 50 || (statusCode !== undefined && statusCode >= 500)) {
    return RED;
  }

  if (level >= 40 || (statusCode !== undefined && statusCode >= 400)) {
    return YELLOW;
  }

  return GREEN;
}

function formatTime(time: string | number | undefined): string {
  const date =
    typeof time === 'number' ? new Date(time) : new Date(time ?? Date.now());
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

function formatLine(obj: HttpLogObject, colorize: boolean): string | null {
  if (obj.context && SKIP_CONTEXTS.has(obj.context)) {
    return null;
  }

  const statusCode = obj.statusCode ?? obj.res?.statusCode;
  const color = colorize ? colorFor(obj.level ?? 30, statusCode) : '';
  const dim = colorize ? DIM : '';
  const reset = colorize ? RESET : '';
  const parts = [`${dim}${formatTime(obj.time)}${reset}`];
  const method = obj.method ?? obj.req?.method;
  const path = obj.path ?? obj.req?.url;
  const requestId = obj.requestId ?? obj.req?.id;

  if (method && path) {
    parts.push(method, path);

    if (statusCode !== undefined) {
      parts.push(String(statusCode));
    }

    if (typeof obj.responseTime === 'number') {
      parts.push(`${obj.responseTime}ms`);
    }

    if (obj.ip) {
      parts.push(obj.ip);
    }

    if (obj.userId) {
      parts.push(`user=${obj.userId}`);
    }

    if (requestId) {
      parts.push(`req=${requestId}`);
    }

    if (obj.err?.message) {
      parts.push(`error=${obj.err.message}`);
    }
  } else if (obj.msg) {
    parts.push(obj.msg);
  } else {
    return null;
  }

  return `${color}${parts.join(' ')}${reset}`;
}

export default function pinoConsoleTransport() {
  return build((source) => {
    source.on('data', (obj: HttpLogObject) => {
      const line = formatLine(obj, true);

      if (line) {
        process.stdout.write(`${line}\n`);
      }
    });
  });
}
