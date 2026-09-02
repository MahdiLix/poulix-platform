import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupUser,
  createTestApp,
  creditWallet,
  getDatabase,
  registerUser,
  type AuthSession,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Financial Destinations API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let user: AuthSession;
  let recipient: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    user = await registerUser(app);
    recipient = await registerUser(app);
    await creditWallet(db, user.userId, 1_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, user.userId);
    await cleanupUser(db, recipient.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records recent P2P recipient after transfer', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ recipient: recipient.username, amount: 100_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/financial-destinations/recent')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(
      response.body.some(
        (item: { type: string; recipientUserId: string }) =>
          item.type === 'P2P_USER' && item.recipientUserId === recipient.userId,
      ),
    ).toBe(true);
  });

  it('creates saved bank destination and returns masked list', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/financial-destinations/saved')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        label: 'Personal account',
        type: 'BANK_ACCOUNT',
        accountNumber: '1234567890',
      })
      .expect(201);

    expect(createResponse.body.maskedValue).toContain('7890');
    expect(createResponse.body.isSaved).toBe(true);

    const valueResponse = await request(app.getHttpServer())
      .get(`/financial-destinations/${createResponse.body.id}/value`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(valueResponse.body.accountNumber).toBe('1234567890');
  });
});
