import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  balanceOf,
  cleanupUser,
  createTestApp,
  getDatabase,
  uniqueUser,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Financial flow', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let userId: string | undefined;

  beforeAll(async () => {
    app = await createTestApp();
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
    userId = registered.body.user.id as string;
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
    expect(balanceOf(deposit.body.balance)).toBe(1000000);

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
      where: { userId },
    });
    expect(balanceOf(wallet.balance)).toBe(300000);
  });
});
