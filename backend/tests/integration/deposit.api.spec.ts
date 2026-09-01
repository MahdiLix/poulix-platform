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
import { FakeZarinpalService } from '../helpers/zarinpal';
import type { DatabaseService } from '../../src/database/database.service';
import { ZarinpalService } from '../../src/payments/zarinpal.service';

const DEPOSIT_AMOUNT = 1000000;

describe('Deposit API (ZarinPal sandbox)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let session: AuthSession;
  let zarinpal: FakeZarinpalService;

  beforeAll(async () => {
    zarinpal = new FakeZarinpalService();
    app = await createTestApp((builder) =>
      builder.overrideProvider(ZarinpalService).useValue(zarinpal),
    );
    db = getDatabase(app);
  });

  beforeEach(async () => {
    zarinpal.verifyCode = 100;
    zarinpal.verifyRefId = '201';
    zarinpal.failRequest = false;
    zarinpal.requestCalls = 0;
    zarinpal.verifyCalls = 0;
    zarinpal.lastVerify = undefined;
    session = await registerUser(app);
  });

  afterEach(async () => {
    await cleanupUser(db, session.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a sandbox payment request without crediting the wallet', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: DEPOSIT_AMOUNT })
      .expect(201);

    expect(typeof response.body.paymentId).toBe('string');
    expect(typeof response.body.paymentUrl).toBe('string');
    expect(response.body.paymentUrl).toContain(
      'https://sandbox.zarinpal.com/pg/StartPay/',
    );
    expect(typeof response.body.authority).toBe('string');
    expect(response.body.authority.startsWith('S')).toBe(true);
    expect(response.body.amount).toBe(DEPOSIT_AMOUNT);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: response.body.authority },
    });
    expect(payment.status).toBe('PENDING');
    expect(balanceOf(payment.amount)).toBe(DEPOSIT_AMOUNT);
  });

  it('cancels a pending sandbox payment on NOK callback without crediting', async () => {
    const created = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: DEPOSIT_AMOUNT })
      .expect(201);

    const callback = await request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ Authority: created.body.authority, Status: 'NOK' })
      .expect(200);

    expect(callback.body.status).toBe('CANCELLED');

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.body.authority },
    });
    expect(payment.status).toBe('CANCELLED');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
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
      .send({ amount: DEPOSIT_AMOUNT })
      .expect(401);
  });
});

describe('Deposit API (callback and verification)', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let session: AuthSession;
  let zarinpal: FakeZarinpalService;

  beforeAll(async () => {
    zarinpal = new FakeZarinpalService();
    app = await createTestApp((builder) =>
      builder.overrideProvider(ZarinpalService).useValue(zarinpal),
    );
    db = getDatabase(app);
  });

  beforeEach(async () => {
    zarinpal.verifyCode = 100;
    zarinpal.verifyRefId = '201';
    zarinpal.failRequest = false;
    zarinpal.requestCalls = 0;
    zarinpal.verifyCalls = 0;
    zarinpal.lastVerify = undefined;
    session = await registerUser(app);
  });

  afterEach(async () => {
    await cleanupUser(db, session.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createDeposit(amount = DEPOSIT_AMOUNT) {
    const response = await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount })
      .expect(201);

    return response.body as {
      paymentId: string;
      authority: string;
      paymentUrl: string;
      amount: number;
    };
  }

  function sendCallback(authority: string, status: string) {
    return request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ Authority: authority, Status: status });
  }

  it('creates a pending payment and returns a ZarinPal start URL', async () => {
    const created = await createDeposit();

    expect(created.paymentUrl).toBe(
      `https://sandbox.zarinpal.com/pg/StartPay/${created.authority}`,
    );
    expect(zarinpal.requestCalls).toBe(1);

    const payment = await db.payment.findUniqueOrThrow({
      where: { id: created.paymentId },
    });
    expect(payment.status).toBe('PENDING');
    expect(payment.authority).toBe(created.authority);
  });

  it('sends the correct payload to ZarinPal request API', async () => {
    const created = await createDeposit();

    expect(zarinpal.lastRequest).toEqual({
      amount: DEPOSIT_AMOUNT,
      description: `Wallet deposit ${created.paymentId}`,
      callbackOrderId: created.paymentId,
      email: session.email,
    });
  });

  it('marks the payment failed when ZarinPal request creation fails', async () => {
    zarinpal.failRequest = true;

    await request(app.getHttpServer())
      .post('/wallets/deposit')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: DEPOSIT_AMOUNT })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    const payments = await db.payment.findMany({
      where: { walletId: wallet.id },
    });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('FAILED');
    expect(balanceOf(wallet.balance)).toBe(0);
  });


  it('does not verify or credit on a cancelled NOK callback', async () => {
    const created = await createDeposit();

    const response = await sendCallback(created.authority, 'NOK').expect(200);
    expect(response.body.status).toBe('CANCELLED');
    expect(zarinpal.verifyCalls).toBe(0);

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.authority },
    });
    expect(payment.status).toBe('CANCELLED');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
  });
  

  it('verifies a successful payment and credits the wallet once', async () => {
    const created = await createDeposit();

    const response = await sendCallback(created.authority, 'OK').expect(200);

    expect(response.body.status).toBe('PAID');
    expect(response.body.alreadyVerified).toBe(false);
    expect(response.body.refId).toBe('201');
    expect(balanceOf(response.body.balance)).toBe(DEPOSIT_AMOUNT);
    expect(zarinpal.verifyCalls).toBe(1);
    expect(zarinpal.lastVerify).toEqual({
      amount: DEPOSIT_AMOUNT,
      authority: created.authority,
    });

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.authority },
    });
    expect(zarinpal.lastVerify?.authority).toBe(payment.authority);
    expect(payment.status).toBe('PAID');
    expect(payment.refId).toBe('201');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(DEPOSIT_AMOUNT);

    const deposits = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT' },
    });
    expect(deposits).toHaveLength(1);
    expect(balanceOf(deposits[0].amount)).toBe(DEPOSIT_AMOUNT);

    const balance = await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(balanceOf(balance.body.balance)).toBe(DEPOSIT_AMOUNT);
  });

  it('credits a pending payment when ZarinPal returns already-verified code 101', async () => {
    zarinpal.verifyCode = 101;
    const created = await createDeposit();

    const response = await sendCallback(created.authority, 'OK').expect(200);
    expect(response.body.status).toBe('PAID');
    expect(response.body.alreadyVerified).toBe(false);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(DEPOSIT_AMOUNT);
  });

  it('marks the payment failed when ZarinPal verification is unsuccessful', async () => {
    zarinpal.verifyCode = -9;
    const created = await createDeposit();

    await sendCallback(created.authority, 'OK').expect(400);

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.authority },
    });
    expect(payment.status).toBe('FAILED');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);

    const deposits = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT' },
    });
    expect(deposits).toHaveLength(0);
  });

  it('rejects a second OK callback without crediting twice', async () => {
    const created = await createDeposit();

    await sendCallback(created.authority, 'OK').expect(200);
    zarinpal.verifyCode = 101;

    const duplicate = await sendCallback(created.authority, 'OK').expect(200);
    expect(duplicate.body.status).toBe('PAID');
    expect(duplicate.body.alreadyVerified).toBe(true);
    expect(zarinpal.verifyCalls).toBe(1);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(DEPOSIT_AMOUNT);

    const deposits = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT' },
    });
    expect(deposits).toHaveLength(1);
  });

  it('ignores a NOK callback after a successful payment', async () => {
    const created = await createDeposit();
    await sendCallback(created.authority, 'OK').expect(200);

    const lateNok = await sendCallback(created.authority, 'NOK').expect(200);
    expect(lateNok.body.status).toBe('PAID');
    expect(lateNok.body.alreadyVerified).toBe(true);

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.authority },
    });
    expect(payment.status).toBe('PAID');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(DEPOSIT_AMOUNT);
  });

  it('credits only once when two OK callbacks arrive together', async () => {
    const created = await createDeposit();

    const [first, second] = await Promise.all([
      sendCallback(created.authority, 'OK'),
      sendCallback(created.authority, 'OK'),
    ]);

    expect(
      [first.status, second.status].every((status) => status === 200),
    ).toBe(true);
    expect([first.body.alreadyVerified, second.body.alreadyVerified]).toEqual(
      expect.arrayContaining([true, false]),
    );

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(DEPOSIT_AMOUNT);

    const deposits = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT' },
    });
    expect(deposits).toHaveLength(1);
  });

  it('does not credit a cancelled payment if a later OK callback arrives', async () => {
    const created = await createDeposit();
    await sendCallback(created.authority, 'NOK').expect(200);

    await sendCallback(created.authority, 'OK').expect(400);

    const payment = await db.payment.findUniqueOrThrow({
      where: { authority: created.authority },
    });
    expect(payment.status).toBe('CANCELLED');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
  });

  it('rejects a callback without an authority', async () => {
    await request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ Status: 'OK' })
      .expect(400);
  });

  it('rejects a callback for an unknown authority', async () => {
    await request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ Authority: 'Sunknownauthority', Status: 'OK' })
      .expect(404);
  });

    it('accepts lowercase callback query parameters', async () => {
    const created = await createDeposit();

    const response = await request(app.getHttpServer())
      .get('/wallets/deposit/callback')
      .query({ authority: created.authority, status: 'OK' })
      .expect(200);

    expect(response.body.status).toBe('PAID');
    expect(balanceOf(response.body.balance)).toBe(DEPOSIT_AMOUNT);
  });

  it('rolls back payment and wallet when DEPOSIT transaction creation fails', async () => {
    const created = await createDeposit();
    const originalTransaction = db.$transaction.bind(db);
    const spy = jest
      .spyOn(db, '$transaction')
      .mockImplementation((fn: unknown, options?: unknown) => {
        if (typeof fn !== 'function') {
          return originalTransaction(fn as never, options as never);
        }

        return originalTransaction(async (tx) => {
          jest
            .spyOn(tx.transaction, 'create')
            .mockRejectedValue(new Error('forced settlement failure'));
          return (fn as (client: typeof tx) => Promise<unknown>)(tx);
        }, options as never);
      });

    try {
      await sendCallback(created.authority, 'OK').expect(500);

      const payment = await db.payment.findUniqueOrThrow({
        where: { authority: created.authority },
      });
      expect(payment.status).toBe('PENDING');

      const wallet = await db.wallet.findUniqueOrThrow({
        where: { userId: session.userId },
      });
      expect(balanceOf(wallet.balance)).toBe(0);

      const deposits = await db.transaction.findMany({
        where: { walletId: wallet.id, type: 'DEPOSIT' },
      });
      expect(deposits).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
});
