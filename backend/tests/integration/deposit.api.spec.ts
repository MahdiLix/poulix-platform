import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  balanceOf,
  cleanupUser,
  createTestApp,
  getDatabase,
  registerUser,
  type AuthSession,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Deposit API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let session: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    session = await registerUser(app);
  });

  afterEach(async () => {
    await cleanupUser(db, session.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deposits funds and increases the wallet balance', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 1000000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(1000000);
    expect(response.body.currency).toBe('IRR');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(1000000);

    const transactions = await db.transaction.findMany({
      where: { walletId: wallet.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].type).toBe('DEPOSIT');
    expect(balanceOf(transactions[0].amount)).toBe(1000000);
  });

  it('rejects a zero deposit amount', async () => {
    await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 0 })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
  });

  it('rejects a negative deposit amount', async () => {
    await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: -100 })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
  });

  it('rejects unauthenticated deposits', async () => {
    await request(app.getHttpServer())
      .post('/wallets/deposit')
      .send({ amount: 1000000 })
      .expect(401);
  });
});
