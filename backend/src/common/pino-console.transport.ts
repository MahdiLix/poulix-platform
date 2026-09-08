import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { WriteStream } from 'node:fs';
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
  userId?: string;
  ip?: string;
  req?: { method?: string; url?: string; ip?: string };
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

  const statusCode = obj.res?.statusCode;
  const color = colorize ? colorFor(obj.level ?? 30, statusCode) : '';
  const dim = colorize ? DIM : '';
  const reset = colorize ? RESET : '';
  const parts = [`${dim}${formatTime(obj.time)}${reset}`];

  if (obj.req?.method && obj.req.url) {
    parts.push(`${obj.req.method} ${obj.req.url}`);

    if (statusCode !== undefined) {
      parts.push(String(statusCode));
    }

    if (typeof obj.responseTime === 'number') {
      parts.push(`${obj.responseTime}ms`);
    }

    const ip = obj.req.ip ?? obj.ip;
    if (ip) {
      parts.push(ip);
    }

    if (obj.userId) {
      parts.push(`user=${obj.userId}`);
    }
  } else if (obj.msg) {
    parts.push(obj.msg);
  } else {
    return null;
  }

  return `${color}${parts.join(' ')}${reset}`;
}

export default function pinoConsoleTransport(options?: { file?: string }) {
  const file = options?.file;
  let stream: WriteStream | undefined;

  if (file) {
    mkdirSync(dirname(file), { recursive: true });
    stream = createWriteStream(file, { flags: 'a' });
  }

  return build((source) => {
    source.on('data', (obj: HttpLogObject) => {
      const line = formatLine(obj, !file);

      if (line) {
        if (stream) {
          stream.write(`${line}\n`);
        } else {
          process.stdout.write(`${line}\n`);
        }
      }
    });
  });
}
