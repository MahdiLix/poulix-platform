import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  balanceOf,
  cleanupUser,
  createTestApp,
  getDatabase,
  uniqueUser,
} from '../helpers/app';
import { FakeZarinpalService } from '../helpers/zarinpal';
import type { DatabaseService } from '../../src/database/database.service';
import { ZarinpalService } from '../../src/payments/zarinpal.service';

describe('Financial flow', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let zarinpal: FakeZarinpalService;
  let userId: string | undefined;

  beforeAll(async () => {
    zarinpal = new FakeZarinpalService();
    app = await createTestApp((builder) =>
      builder.overrideProvider(ZarinpalService).useValue(zarinpal),
    );
    db = getDatabase(app);
  });

  afterEach(async () => {
    if (userId) {
      await cleanupUser(db, userId);
      userId = undefined;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, deposits, withdraws, and checks balances', async () => {
    const user = uniqueUser();
    const http = request(app.getHttpServer());

    const registered = await http.post('/auth/register').send(user).expect(201);
    const registeredUserId = registered.body.user.id as string;
    userId = registeredUserId;
    expect(typeof registered.body.accessToken).toBe('string');

    const login = await http
      .post('/auth/login')
      .send({ identifier: user.username, password: user.password })
      .expect(201);
    const accessToken = login.body.accessToken as string;
    expect(accessToken.length).toBeGreaterThan(20);

    const auth = { Authorization: `Bearer ${accessToken}` };

    const initialBalance = await http
      .get('/wallets/balance')
      .set(auth)
      .expect(200);
    expect(balanceOf(initialBalance.body.balance)).toBe(0);

    const deposit = await http
      .post('/wallets/deposit')
      .set(auth)
      .send({ amount: 1000000 })
      .expect(201);
    expect(typeof deposit.body.paymentUrl).toBe('string');
    expect(deposit.body.paymentUrl).toContain('/pg/StartPay/');
    expect(deposit.body.authority).toBeDefined();

    const pendingBalance = await http.get('/wallets/balance').set(auth).expect(200);
    expect(balanceOf(pendingBalance.body.balance)).toBe(0);

    const verified = await http
      .get('/wallets/deposit/callback')
      .query({ Authority: deposit.body.authority, Status: 'OK' })
      .expect(200);
    expect(verified.body.status).toBe('PAID');
    expect(verified.body.alreadyVerified).toBe(false);
    expect(balanceOf(verified.body.balance)).toBe(1000000);

    const afterDeposit = await http
      .get('/wallets/balance')
      .set(auth)
      .expect(200);
    expect(balanceOf(afterDeposit.body.balance)).toBe(1000000);

    const withdraw = await http
      .post('/wallets/withdraw')
      .set(auth)
      .send({ amount: 700000, accountNumber: '1234567890' })
      .expect(201);
    expect(balanceOf(withdraw.body.balance)).toBe(300000);

    const finalBalance = await http
      .get('/wallets/balance')
      .set(auth)
      .expect(200);
    expect(balanceOf(finalBalance.body.balance)).toBe(300000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: registeredUserId },
    });
    expect(balanceOf(wallet.balance)).toBe(300000);

    const deposits = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'DEPOSIT' },
    });
    expect(deposits).toHaveLength(1);
    expect(zarinpal.verifyCalls).toBe(1);
  });
});
