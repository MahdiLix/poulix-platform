import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, type AuthSession, uniqueUser } from '../helpers/app';
import { getRateLimitConfig } from '../../src/rate-limit';

export function rateLimitConfig() {
  return getRateLimitConfig();
}

let testIpCounter = 50;

export function nextTestIp(prefix = '192.0.2'): string {
  testIpCounter += 1;
  return `${prefix}.${(testIpCounter % 200) + 20}`;
}

export function forwardedIp(ip: string) {
  return { 'X-Forwarded-For': ip };
}

export async function createRateLimitApp(
  configure?: Parameters<typeof createTestApp>[0],
): Promise<INestApplication> {
  const app = await createTestApp(configure);
  const http = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  http.set?.('trust proxy', 1);
  return app;
}

export async function registerUserFromIp(
  app: INestApplication,
  ip: string = nextTestIp(),
  user = uniqueUser(),
): Promise<AuthSession> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .set(forwardedIp(ip))
    .send(user)
    .expect(201);

  return {
    ...user,
    userId: response.body.user.id as string,
    accessToken: response.body.accessToken as string,
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRetryAfter(response: request.Response) {
  const raw = response.headers['retry-after'];
  const seconds = Number(raw);
  const waitMs =
    (Number.isFinite(seconds) && seconds > 0 ? seconds : 1) * 1000 + 250;
  await sleep(waitMs);
}
