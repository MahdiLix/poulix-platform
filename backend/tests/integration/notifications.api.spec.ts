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

describe('Notifications API', () => {
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

  it('returns empty list for new user', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('creates notifications when withdrawing and lists them', async () => {
    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ amount: 100_000, accountNumber: '1234567890' })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(listResponse.body.length).toBe(1);
    expect(listResponse.body[0].type).toBe('WITHDRAWAL_SUCCESS');
    expect(listResponse.body[0].category).toBe('SUCCESS');
    expect(listResponse.body[0].isRead).toBe(false);
    expect(listResponse.body[0].metadata.amount).toBe(100_000);

    const countResponse = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(countResponse.body.count).toBe(1);
  });

  it('creates transfer notifications for sender and recipient', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 250_000,
      })
      .expect(201);

    const senderNotifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(
      senderNotifications.body.some(
        (n: { type: string }) => n.type === 'TRANSFER_SUCCESS',
      ),
    ).toBe(true);

    const recipientNotifications = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${recipient.accessToken}`)
      .expect(200);

    expect(
      recipientNotifications.body.some(
        (n: { type: string }) => n.type === 'TRANSFER_RECEIVED',
      ),
    ).toBe(true);
  });

  it('marks one notification as read and all as read', async () => {
    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ amount: 50_000, accountNumber: '1234567890' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 100_000,
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const firstId = listResponse.body[0].id as string;

    const markOne = await request(app.getHttpServer())
      .post(`/notifications/${firstId}/read`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(201);

    expect(markOne.body.isRead).toBe(true);

    const countAfterOne = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(countAfterOne.body.count).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(201);

    const countAfterAll = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(countAfterAll.body.count).toBe(0);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401);
  });
});
