import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupUser,
  createTestApp,
  creditWallet,
  getDatabase,
  registerUser,
  balanceOf,
  type AuthSession,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Spending Limits API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let user: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    user = await registerUser(app);
    await creditWallet(db, user.userId, 10_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, user.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns default limits with usage', async () => {
    const response = await request(app.getHttpServer())
      .get('/spending-limits')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(response.body.length).toBe(4);
    expect(
      response.body.some(
        (item: { type: string }) => item.type === 'DAILY_TRANSFER',
      ),
    ).toBe(true);
  });

  it('rejects withdrawal exceeding daily withdrawal limit', async () => {
    await request(app.getHttpServer())
      .put('/spending-limits')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ type: 'DAILY_WITHDRAWAL', maxAmount: 50_000 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ amount: 100_000, accountNumber: '1234567890' })
      .expect(400);

    const failedWithdrawals = await db.securityEvent.count({
      where: { userId: user.userId, type: 'FAILED_WITHDRAWAL' },
    });
    expect(failedWithdrawals).toBe(0);
  });

  it('does not allow concurrent transfers to exceed the daily limit', async () => {
    const recipient = await registerUser(app);
    try {
      await request(app.getHttpServer())
        .put('/spending-limits')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ type: 'DAILY_TRANSFER', maxAmount: 150_000 })
        .expect(200);

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .post('/wallets/transfer')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ recipient: recipient.username, amount: 100_000 }),
        request(app.getHttpServer())
          .post('/wallets/transfer')
          .set('Authorization', `Bearer ${user.accessToken}`)
          .send({ recipient: recipient.username, amount: 100_000 }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 400]);

      const wallet = await db.wallet.findUniqueOrThrow({
        where: { userId: user.userId },
      });
      expect(balanceOf(wallet.balance)).toBe(9_900_000);
    } finally {
      await cleanupUser(db, recipient.userId);
    }
  });
});
