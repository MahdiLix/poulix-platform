import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  balanceOf,
  cleanupUser,
  createTestApp,
  creditWallet,
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
    await creditWallet(db, session.userId, amount);
  }

  it('withdraws to a valid account number and decreases the balance', async () => {
    await deposit(1_000_000);

    const response = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 700_000, accountNumber: ACCOUNT_NUMBER })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(300_000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(300_000);

    const withdrawals = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'WITHDRAWAL' },
    });
    expect(withdrawals).toHaveLength(1);
    expect(balanceOf(withdrawals[0].amount)).toBe(700_000);
  });

  it('stores optional reason and category on withdrawal', async () => {
    await deposit(1_000_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        amount: 200_000,
        accountNumber: ACCOUNT_NUMBER,
        reason: 'Monthly rent',
        category: 'RENT',
      })
      .expect(201);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    const withdrawals = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'WITHDRAWAL' },
    });
    expect(withdrawals).toHaveLength(1);
    expect(withdrawals[0].reason).toBe('Monthly rent');
    expect(withdrawals[0].category).toBe('RENT');
  });

  it('withdraws to a valid Shaba number and decreases the balance', async () => {
    await deposit(1_000_000);

    const response = await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 250_000, shabaNumber: SHABA_NUMBER })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(750_000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(750_000);
  });

  it('rejects a withdrawal that exceeds the available balance', async () => {
    await deposit(500_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 700_000, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500_000);
  });

  it('rejects a zero withdrawal amount', async () => {
    await deposit(500_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 0, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500_000);
  });

  it('rejects a negative withdrawal amount', async () => {
    await deposit(500_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: -100, accountNumber: ACCOUNT_NUMBER })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500_000);
  });

  it('rejects an invalid account number', async () => {
    await deposit(500_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000, accountNumber: 'invalid' })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500_000);
  });

  it('rejects an invalid Shaba number', async () => {
    await deposit(500_000);

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000, shabaNumber: 'ir123' })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(500_000);
  });

  it('rejects unauthenticated withdrawals', async () => {
    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .send({ amount: 100_000, accountNumber: ACCOUNT_NUMBER })
      .expect(401);
  });

  it('funds a withdrawal from an envelope without debiting the wallet', async () => {
    await deposit(1_000_000);
    const envelope = await db.envelope.create({
      data: {
        userId: session.userId,
        name: 'Bills',
        allocatedAmount: 400_000,
      },
    });

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        amount: 250_000,
        accountNumber: ACCOUNT_NUMBER,
        envelopeId: envelope.id,
      })
      .expect(201);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    const updatedEnvelope = await db.envelope.findUniqueOrThrow({
      where: { id: envelope.id },
    });
    const withdrawal = await db.transaction.findFirstOrThrow({
      where: { walletId: wallet.id, type: 'WITHDRAWAL' },
    });

    expect(balanceOf(wallet.balance)).toBe(1_000_000);
    expect(balanceOf(updatedEnvelope.allocatedAmount)).toBe(150_000);
    expect(withdrawal.envelopeId).toBe(envelope.id);
  });

  it('rejects an envelope-funded withdrawal with insufficient allocation', async () => {
    await deposit(1_000_000);
    const envelope = await db.envelope.create({
      data: {
        userId: session.userId,
        name: 'Small budget',
        allocatedAmount: 50_000,
      },
    });

    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        amount: 100_000,
        accountNumber: ACCOUNT_NUMBER,
        envelopeId: envelope.id,
      })
      .expect(400);

    const unchanged = await db.envelope.findUniqueOrThrow({
      where: { id: envelope.id },
    });
    expect(balanceOf(unchanged.allocatedAmount)).toBe(50_000);
  });
});
