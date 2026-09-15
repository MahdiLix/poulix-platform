import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupUser, getDatabase, uniqueUser } from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';
import {
  createRateLimitApp,
  forwardedIp,
  rateLimitConfig,
  registerUserFromIp,
  sleep,
  waitForRetryAfter,
} from './helpers';

describe('Login security', () => {
  let app: INestApplication;
  let db: DatabaseService;
  const createdUserIds: string[] = [];

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

  function login(ip: string, identifier: string, password: string) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set(forwardedIp(ip))
      .send({ identifier, password });
  }

  it('enforces an IP login rate limit separately from account lockout', async () => {
    const { login: loginLimit } = rateLimitConfig();
    const ip = '198.51.100.10';

    for (let i = 0; i < loginLimit.limit; i += 1) {
      const response = await login(
        ip,
        `missing${i}@example.com`,
        'wrong-password',
      );
      expect(response.status).toBe(401);
    }

    const blocked = await login(
      ip,
      'missing-final@example.com',
      'wrong-password',
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['x-ratelimit-name']).toBe('login');

    await waitForRetryAfter(blocked);
    const resumed = await login(
      ip,
      'missing-after@example.com',
      'wrong-password',
    );
    expect(resumed.status).toBe(401);
  });

  it('locks an account after consecutive failed logins and expires automatically', async () => {
    const { accountLockout } = rateLimitConfig();
    const user = uniqueUser();
    const session = await registerUserFromIp(app, '198.51.100.20', user);
    createdUserIds.push(session.userId);

    for (let i = 0; i < accountLockout.maxFailedAttempts - 1; i += 1) {
      const failed = await login(
        `198.51.100.${30 + i}`,
        user.email,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
      expect(failed.body.message).toBe('Invalid credentials');
    }

    const locked = await login('198.51.100.40', user.email, 'wrong-password');
    expect(locked.status).toBe(401);
    expect(locked.body.message).toBe('Account temporarily locked');
    expect(locked.headers['retry-after']).toBeDefined();
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);

    await sleep(accountLockout.lockTtlMs + 250);

    const unlocked = await login('198.51.100.41', user.email, user.password);
    expect(unlocked.status).toBe(201);
    expect(typeof unlocked.body.accessToken).toBe('string');
  });

  it('resets the failed-attempt counter after a successful login', async () => {
    const { accountLockout } = rateLimitConfig();
    const user = uniqueUser();
    const session = await registerUserFromIp(app, '198.51.100.50', user);
    createdUserIds.push(session.userId);

    for (let i = 0; i < accountLockout.maxFailedAttempts - 1; i += 1) {
      const failed = await login(
        `198.51.100.${51 + i}`,
        user.email,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
    }

    const success = await login('198.51.100.60', user.email, user.password);
    expect(success.status).toBe(201);

    for (let i = 0; i < accountLockout.maxFailedAttempts - 1; i += 1) {
      const failed = await login(
        `198.51.100.${61 + i}`,
        user.email,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
      expect(failed.body.message).toBe('Invalid credentials');
    }

    const nowLocked = await login(
      '198.51.100.70',
      user.email,
      'wrong-password',
    );
    expect(nowLocked.status).toBe(401);
    expect(nowLocked.body.message).toBe('Account temporarily locked');
    expect(nowLocked.headers['retry-after']).toBeDefined();
  });

  it('does not treat an IP 429 as an account lock', async () => {
    const { login: loginLimit } = rateLimitConfig();
    const user = uniqueUser();
    const session = await registerUserFromIp(app, '198.51.100.80', user);
    createdUserIds.push(session.userId);
    const ip = '198.51.100.81';

    for (let i = 0; i < loginLimit.limit; i += 1) {
      await login(ip, `other${i}@example.com`, 'wrong-password');
    }

    const ipBlocked = await login(ip, user.email, user.password);
    expect(ipBlocked.status).toBe(429);

    const fromOtherIp = await login('198.51.100.82', user.email, user.password);
    expect(fromOtherIp.status).toBe(201);
  });

  it('does not consume an IP login quota when locking a different account', async () => {
    const { login: loginLimit, accountLockout } = rateLimitConfig();
    const watchedIp = '198.51.100.90';
    const user = uniqueUser();
    const session = await registerUserFromIp(app, '198.51.100.91', user);
    createdUserIds.push(session.userId);

    for (let i = 0; i < loginLimit.limit - 1; i += 1) {
      const failed = await login(
        watchedIp,
        `unrelated${i}@example.com`,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
    }

    for (let i = 0; i < accountLockout.maxFailedAttempts - 1; i += 1) {
      const failed = await login(
        `198.51.100.${92 + i}`,
        user.email,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
      expect(failed.body.message).toBe('Invalid credentials');
    }

    const locked = await login('198.51.100.96', user.email, 'wrong-password');
    expect(locked.status).toBe(401);
    expect(locked.body.message).toBe('Account temporarily locked');

    const stillOpen = await login(
      watchedIp,
      'another-missing@example.com',
      'wrong-password',
    );
    expect(stillOpen.status).toBe(401);
    expect(stillOpen.body.message).toBe('Invalid credentials');

    const ipBlocked = await login(
      watchedIp,
      'final-missing@example.com',
      'wrong-password',
    );
    expect(ipBlocked.status).toBe(429);
    expect(ipBlocked.headers['x-ratelimit-name']).toBe('login');
  });

  it('does not count login attempts toward the global burst limiter', async () => {
    const { login: loginLimit, burst } = rateLimitConfig();
    const ip = '198.51.100.130';

    for (let i = 0; i < loginLimit.limit; i += 1) {
      const failed = await login(ip, `burst${i}@example.com`, 'wrong-password');
      expect(failed.status).toBe(401);
    }

    const loginBlocked = await login(
      ip,
      'burst-final@example.com',
      'wrong-password',
    );
    expect(loginBlocked.status).toBe(429);
    expect(loginBlocked.headers['x-ratelimit-name']).toBe('login');

    for (let i = 0; i < burst.limit; i += 1) {
      const probe = await request(app.getHttpServer())
        .get('/wallets/balance')
        .set(forwardedIp(ip));
      expect(probe.status).not.toBe(429);
    }

    const burstBlocked = await request(app.getHttpServer())
      .get('/wallets/balance')
      .set(forwardedIp(ip));
    expect(burstBlocked.status).toBe(429);
    expect(burstBlocked.headers['x-ratelimit-name']).toBe('burst');
  });

  it('does not record failed-password events while the account is locked', async () => {
    const { accountLockout } = rateLimitConfig();
    const user = uniqueUser();
    const session = await registerUserFromIp(app, '198.51.100.100', user);
    createdUserIds.push(session.userId);

    for (let i = 0; i < accountLockout.maxFailedAttempts - 1; i += 1) {
      const failed = await login(
        `198.51.100.${101 + i}`,
        user.email,
        'wrong-password',
      );
      expect(failed.status).toBe(401);
      expect(failed.body.message).toBe('Invalid credentials');
    }

    const locked = await login('198.51.100.110', user.email, 'wrong-password');
    expect(locked.status).toBe(401);
    expect(locked.body.message).toBe('Account temporarily locked');

    const failedLoginsBeforeLock = await db.securityEvent.count({
      where: { userId: session.userId, type: 'FAILED_LOGIN' },
    });
    expect(failedLoginsBeforeLock).toBe(accountLockout.maxFailedAttempts);

    const stillLocked = await login(
      '198.51.100.111',
      user.email,
      'wrong-password',
    );
    expect(stillLocked.status).toBe(401);
    expect(stillLocked.body.message).toBe('Account temporarily locked');

    const failedLoginsWhileLocked = await db.securityEvent.count({
      where: { userId: session.userId, type: 'FAILED_LOGIN' },
    });
    expect(failedLoginsWhileLocked).toBe(failedLoginsBeforeLock);
  });
});
