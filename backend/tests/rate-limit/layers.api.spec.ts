import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupUser, getDatabase } from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';
import {
  createRateLimitApp,
  forwardedIp,
  rateLimitConfig,
  registerUserFromIp,
  waitForRetryAfter,
} from './helpers';

describe('Rate limit layers', () => {
  let app: INestApplication;
  let db: DatabaseService;
  const createdUserIds: string[] = [];
  const probeIp = '203.0.113.10';

  beforeAll(async () => {
    app = await createRateLimitApp();
    db = getDatabase(app);
  });

  afterEach(async () => {
    await Promise.all(
      createdUserIds.splice(0).map((userId) => cleanupUser(db, userId)),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function probe(ip = probeIp) {
    return request(app.getHttpServer())
      .get('/wallets/balance')
      .set(forwardedIp(ip));
  }

  it('enforces layer 1 burst independently and returns Retry-After', async () => {
    const { burst } = rateLimitConfig();

    for (let i = 0; i < burst.limit; i += 1) {
      const allowed = await probe();
      expect(allowed.status).not.toBe(429);
    }

    const blocked = await probe();
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['x-ratelimit-name']).toBe('burst');

    await waitForRetryAfter(blocked);
    const resumed = await probe();
    expect(resumed.status).not.toBe(429);
  });

  it('enforces layer 2 independently from layer 1', async () => {
    const { burst, short } = rateLimitConfig();
    const ip = '203.0.113.11';

    for (let i = 0; i < burst.limit; i += 1) {
      expect((await probe(ip)).status).not.toBe(429);
    }
    const burstBlocked = await probe(ip);
    expect(burstBlocked.status).toBe(429);
    expect(burstBlocked.headers['x-ratelimit-name']).toBe('burst');

    await waitForRetryAfter(burstBlocked);

    const remainingShort = short.limit - burst.limit;
    for (let i = 0; i < remainingShort; i += 1) {
      expect((await probe(ip)).status).not.toBe(429);
    }

    const secondBurst = await probe(ip);
    expect(secondBurst.status).toBe(429);
    expect(secondBurst.headers['x-ratelimit-name']).toBe('burst');
    await waitForRetryAfter(secondBurst);

    const shortBlocked = await probe(ip);
    expect(shortBlocked.status).toBe(429);
    expect(shortBlocked.headers['x-ratelimit-name']).toBe('short');
    expect(shortBlocked.headers['retry-after']).toBeDefined();
  });

  it('enforces layer 3 by user id rather than only IP', async () => {
    const { burst, user } = rateLimitConfig();
    const setupIp = '203.0.113.20';
    const ipA = '203.0.113.21';
    const ipB = '203.0.113.22';
    const ipC = '203.0.113.23';
    const extraIps = ['203.0.113.24', '203.0.113.25'];
    const overflowIp = '203.0.113.26';
    const otherUserIp = '203.0.113.27';

    const session = await registerUserFromIp(app, setupIp);
    createdUserIds.push(session.userId);
    const other = await registerUserFromIp(app, setupIp);
    createdUserIds.push(other.userId);

    async function authed(ip: string, token: string) {
      return request(app.getHttpServer())
        .get('/wallets/balance')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${token}`);
    }

    async function fillUserQuota(token: string) {
      const perIp = burst.limit;
      const waves = Math.ceil(user.limit / perIp);
      const ips = [ipA, ipB, ipC, ...extraIps].slice(0, waves);

      let sent = 0;
      for (const ip of ips) {
        const count = Math.min(perIp, user.limit - sent);
        for (let i = 0; i < count; i += 1) {
          expect((await authed(ip, token)).status).not.toBe(429);
          sent += 1;
        }
      }
      expect(sent).toBe(user.limit);
    }

    await fillUserQuota(session.accessToken);

    const userBlocked = await authed(overflowIp, session.accessToken);
    expect(userBlocked.status).toBe(429);
    expect(userBlocked.headers['x-ratelimit-name']).toBe('user');
    expect(userBlocked.headers['retry-after']).toBeDefined();

    const otherUser = await authed(otherUserIp, other.accessToken);
    expect(otherUser.status).not.toBe(429);
  });

  it('does not apply rate limiting to the ZarinPal deposit callback', async () => {
    const { burst } = rateLimitConfig();
    const ip = '203.0.113.30';

    for (let i = 0; i < burst.limit; i += 1) {
      expect((await probe(ip)).status).not.toBe(429);
    }
    expect((await probe(ip)).status).toBe(429);

    const callback = await request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ Authority: 'Smissing', Status: 'OK' })
      .set(forwardedIp(ip))
      .set('Accept', 'application/json');

    expect(callback.status).not.toBe(429);
  });

  it('does not consume burst on authenticated dashboard reads', async () => {
    const { burst } = rateLimitConfig();
    const ip = '203.0.113.31';
    const session = await registerUserFromIp(app, ip);
    createdUserIds.push(session.userId);

    for (let i = 0; i < burst.limit; i += 1) {
      expect((await probe(ip)).status).not.toBe(429);
    }
    expect((await probe(ip)).status).toBe(429);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.username).toBeDefined();
  });

  it('does not apply the user layer to authenticated dashboard reads in test', async () => {
    const { user } = rateLimitConfig();
    const ip = '203.0.113.32';
    const session = await registerUserFromIp(app, ip);
    createdUserIds.push(session.userId);

    for (let i = 0; i < user.limit + 3; i += 1) {
      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`);
      expect(me.status).toBe(200);
    }
  });
});

describe('Development mode', () => {
  const original = process.env.RATE_LIMIT_ENABLED;

  afterEach(() => {
    process.env.RATE_LIMIT_ENABLED = original;
  });

  it('does not enforce rate limiting when RATE_LIMIT_ENABLED is false', async () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    const app = await createRateLimitApp();
    const ip = '203.0.113.40';
    const { burst } = rateLimitConfig();

    try {
      for (let i = 0; i < burst.limit + 5; i += 1) {
        const response = await request(app.getHttpServer())
          .get('/wallets/balance')
          .set(forwardedIp(ip));
        expect(response.status).not.toBe(429);
      }
    } finally {
      await app.close();
    }
  });
});
