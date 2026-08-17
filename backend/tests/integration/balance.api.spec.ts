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

describe('Balance API', () => {
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

  it('returns the authenticated user balance', async () => {
    const response = await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(balanceOf(response.body.balance)).toBe(0);
    expect(response.body.currency).toBe('IRR');

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(0);
  });

  it('rejects unauthenticated balance requests', async () => {
    await request(app.getHttpServer()).get('/wallets/balance').expect(401);
  });
});
