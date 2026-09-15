import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupUser,
  creditWallet,
  getDatabase,
  uniqueUser,
} from '../helpers/app';
import { FakeZarinpalService } from '../helpers/zarinpal';
import type { DatabaseService } from '../../src/database/database.service';
import { ZarinpalService } from '../../src/payments/zarinpal.service';
import {
  createRateLimitApp,
  forwardedIp,
  nextTestIp,
  rateLimitConfig,
  registerUserFromIp,
  waitForRetryAfter,
} from './helpers';

describe('Endpoint-specific rate limits', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let zarinpal: FakeZarinpalService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    zarinpal = new FakeZarinpalService();
    app = await createRateLimitApp((builder) =>
      builder.overrideProvider(ZarinpalService).useValue(zarinpal),
    );
    db = getDatabase(app);
  });

  afterEach(async () => {
    for (const userId of createdUserIds.splice(0)) {
      await cleanupUser(db, userId);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSession() {
    const session = await registerUserFromIp(app);
    createdUserIds.push(session.userId);
    await creditWallet(db, session.userId, 5_000_000);
    return session;
  }

  it('limits registrations independently per IP', async () => {
    const { register } = rateLimitConfig();
    const ip = '192.0.2.10';
    const otherIp = '192.0.2.18';

    for (let i = 0; i < register.limit; i += 1) {
      const user = uniqueUser();
      const created = await request(app.getHttpServer())
        .post('/auth/register')
        .set(forwardedIp(ip))
        .send(user);
      expect(created.status).toBe(201);
      createdUserIds.push(created.body.user.id as string);
    }

    const blocked = await request(app.getHttpServer())
      .post('/auth/register')
      .set(forwardedIp(ip))
      .send(uniqueUser());
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-name']).toBe('register');

    const other = uniqueUser();
    const allowed = await request(app.getHttpServer())
      .post('/auth/register')
      .set(forwardedIp(otherIp))
      .send(other);
    expect(allowed.status).toBe(201);
    createdUserIds.push(allowed.body.user.id as string);
  });

  it('limits deposit independently from payments and withdraw', async () => {
    const { deposit, payments } = rateLimitConfig();
    const session = await createSession();
    const ip = '192.0.2.11';

    async function depositFromIp(amount: number) {
      return request(app.getHttpServer())
        .post('/wallets/deposit')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ amount });
    }

    for (let i = 0; i < payments.limit; i += 1) {
      expect((await depositFromIp(100_000)).status).toBe(201);
    }

    const paymentsBlocked = await depositFromIp(100_000);
    expect(paymentsBlocked.status).toBe(429);
    expect(paymentsBlocked.headers['x-ratelimit-name']).toBe('payments');
    await waitForRetryAfter(paymentsBlocked);

    const remainingDeposit = deposit.limit - payments.limit;
    expect(remainingDeposit).toBeGreaterThan(0);
    for (let i = 0; i < remainingDeposit; i += 1) {
      expect((await depositFromIp(100_000)).status).toBe(201);
    }

    const blocked = await depositFromIp(100_000);
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-name']).toBe('deposit');

    const withdraw = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 10_000, accountNumber: '1234567890' });
    expect(withdraw.status).toBe(201);
  });

  it('limits withdrawal independently from deposit', async () => {
    const { withdraw } = rateLimitConfig();
    const session = await createSession();
    const ip = '192.0.2.12';

    for (let i = 0; i < withdraw.limit; i += 1) {
      const created = await request(app.getHttpServer())
        .post('/wallets/withdraw')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ amount: 10_000, accountNumber: '1234567890' });
      expect(created.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 10_000, accountNumber: '1234567890' });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-name']).toBe('withdraw');

    const deposit = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000 });
    expect(deposit.status).toBe(201);
  });

  it('limits transfer independently from withdraw', async () => {
    const { transfer } = rateLimitConfig();
    const sender = await createSession();
    const recipient = uniqueUser();
    const recipientSession = await registerUserFromIp(
      app,
      nextTestIp(),
      recipient,
    );
    createdUserIds.push(recipientSession.userId);
    const ip = '192.0.2.13';

    for (let i = 0; i < transfer.limit; i += 1) {
      const created = await request(app.getHttpServer())
        .post('/wallets/transfer')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({ recipient: recipient.username, amount: 10_000 });
      expect(created.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({ recipient: recipient.username, amount: 10_000 });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-name']).toBe('transfer');

    const withdraw = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({ amount: 10_000, accountNumber: '1234567890' });
    expect(withdraw.status).toBe(201);
  });

  it('limits payment creation independently from the deposit window', async () => {
    const { payments, deposit } = rateLimitConfig();
    expect(payments.limit).not.toBe(deposit.limit);
    const session = await createSession();
    const ip = '192.0.2.14';

    for (let i = 0; i < payments.limit; i += 1) {
      const created = await request(app.getHttpServer())
        .post('/wallets/deposit')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ amount: 50_000 });
      expect(created.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 50_000 });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers['x-ratelimit-name']).toBe('payments');

    const withdraw = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 10_000, accountNumber: '1234567890' });
    expect(withdraw.status).toBe(201);
  });

  it('limits saved destination mutations independently', async () => {
    const { destinations } = rateLimitConfig();
    const session = await createSession();
    const ip = '192.0.2.15';

    for (let i = 0; i < destinations.limit; i += 1) {
      const created = await request(app.getHttpServer())
        .post('/financial-destinations/saved')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          label: `Bank ${i}`,
          type: 'BANK_ACCOUNT',
          accountNumber: `123456789${i}`,
        });
      expect(created.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/financial-destinations/saved')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        label: 'Bank extra',
        type: 'BANK_ACCOUNT',
        accountNumber: '1234567899',
      });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-name']).toBe('destinations');
  });

  it('limits scheduled payment mutations independently', async () => {
    const { scheduled } = rateLimitConfig();
    const sender = await createSession();
    const recipient = uniqueUser();
    const recipientSession = await registerUserFromIp(
      app,
      nextTestIp(),
      recipient,
    );
    createdUserIds.push(recipientSession.userId);
    const ip = '192.0.2.16';
    const startDate = new Date(Date.now() + 60_000).toISOString();

    for (let i = 0; i < scheduled.limit; i += 1) {
      const created = await request(app.getHttpServer())
        .post('/scheduled-payments')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({
          recipient: recipient.username,
          amount: 20_000,
          frequency: 'MONTHLY',
          startDate,
        });
      expect(created.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/scheduled-payments')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 20_000,
        frequency: 'MONTHLY',
        startDate,
      });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-name']).toBe('scheduled');
  });

  it('limits security limit updates independently', async () => {
    const { securityLimits } = rateLimitConfig();
    const session = await createSession();
    const ip = '192.0.2.17';

    for (let i = 0; i < securityLimits.limit; i += 1) {
      const updated = await request(app.getHttpServer())
        .put('/spending-limits')
        .set(forwardedIp(ip))
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ type: 'DAILY_TRANSFER', maxAmount: 1_000_000 + i });
      expect(updated.status).toBe(200);
    }

    const blocked = await request(app.getHttpServer())
      .put('/spending-limits')
      .set(forwardedIp(ip))
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ type: 'DAILY_TRANSFER', maxAmount: 2_000_000 });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-name']).toBe('securityLimits');
  });
});
