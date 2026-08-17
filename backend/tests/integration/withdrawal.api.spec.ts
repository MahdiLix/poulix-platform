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

const ACCOUNT_NUMBER = '1234567890';
const SHABA_NUMBER = 'IR123456789012345678901234';

describe('Withdrawal API', () => {
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

  async function deposit(amount: number) {
    await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount })
      .expect(201);
  }

  it('withdraws to a valid account number and decreases the balance', async () => {
    await deposit(1000000);

    const response = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 700000, accountNumber: ACCOUNT_NUMBER })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(300000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(300000);

    const withdrawals = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'WITHDRAWAL' },
    });
    expect(withdrawals).toHaveLength(1);
    expect(balanceOf(withdrawals[0].amount)).toBe(700000);
  });

  it('withdraws to a valid Shaba number and decreases the balance', async () => {
    await deposit(1000000);

    const response = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 250000, shabaNumber: SHABA_NUMBER })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(750000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(750000);
  });

  it('rejects a withdrawal that exceeds the available balance', async () => {
    await deposit(500000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 700000, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500000);
  });

  it('rejects a zero withdrawal amount', async () => {
    await deposit(500000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 0, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500000);
  });

  it('rejects a negative withdrawal amount', async () => {
    await deposit(500000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: -100, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500000);
  });

  it('rejects an invalid account number', async () => {
    await deposit(500000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100000, accountNumber: 'invalid' })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500000);
  });

  it('rejects an invalid Shaba number', async () => {
    await deposit(500000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100000, shabaNumber: 'ir123' })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500000);
  });

  it('rejects unauthenticated withdrawals', async () => {
    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .send({ amount: 100000, accountNumber: ACCOUNT_NUMBER })
      .expect(401);
  });
});
