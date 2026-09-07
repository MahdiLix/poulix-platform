import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupUser,
  createTestApp,
  creditWallet,
  getDatabase,
  promoteToAdmin,
  registerUser,
  uniqueUser,
  type AuthSession,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Admin API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let admin: AuthSession;
  let user: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    admin = await registerUser(app);
    user = await registerUser(app);
    await promoteToAdmin(db, admin.userId);
    await creditWallet(db, user.userId, 1_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, admin.userId);
    await cleanupUser(db, user.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to admin APIs', async () => {
    await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
  });

  it('rejects USER access to admin APIs', async () => {
    await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
  });

  it('allows ADMIN access to the dashboard with real totals', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.users.total).toBeGreaterThanOrEqual(2);
    expect(response.body.wallets.total).toBeGreaterThanOrEqual(2);
    expect(response.body.transactions.deposits).toBeGreaterThanOrEqual(1);
    expect(typeof response.body.transactions.depositAmount).toBe('number');
    expect(typeof response.body.operations.suspiciousEvents).toBe('number');
  });

  it('keeps newly registered users as USER even if a role is supplied', async () => {
    const extra = uniqueUser();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...extra, role: 'ADMIN' })
      .expect(201);

    expect(response.body.user.role).toBe('USER');

    const stored = await db.user.findUniqueOrThrow({
      where: { id: response.body.user.id },
      select: { role: true },
    });
    expect(stored.role).toBe('USER');

    await cleanupUser(db, response.body.user.id);
  });

  it('lists users and returns user details for admins only', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    const list = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ q: user.username })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(
      list.body.items.some((item: { id: string }) => item.id === user.userId),
    ).toBe(true);
    expect(list.body.items[0]).not.toHaveProperty('passwordHash');

    const detail = await request(app.getHttpServer())
      .get(`/admin/users/${user.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(detail.body.id).toBe(user.userId);
    expect(detail.body.wallet.balance).toBe(1_000_000);
    expect(detail.body).not.toHaveProperty('passwordHash');
  });

  it('disables a user, blocks login, and writes an audit log', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${user.userId}/disable`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ confirm: true, reason: 'Policy review' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: user.password })
      .expect(401);

    await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(401);

    const logs = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(
      logs.body.items.some(
        (item: { action: string; targetId: string }) =>
          item.action === 'USER_DISABLED' && item.targetId === user.userId,
      ),
    ).toBe(true);
  });

  it('prevents an admin from disabling their own account', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${admin.userId}/disable`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ confirm: true })
      .expect(400);
  });

  it('filters transactions by type', async () => {
    await request(app.getHttpServer())
      .post('/wallets/withdraw')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ amount: 50_000, accountNumber: '1234567890' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/admin/transactions')
      .query({ type: 'WITHDRAWAL' })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(
      response.body.items.every(
        (item: { type: string }) => item.type === 'WITHDRAWAL',
      ),
    ).toBe(true);
  });

  it('locks a user and allows unlock', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${user.userId}/lock`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ confirm: true, reason: 'Suspicious activity' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: user.password })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/admin/users/${user.userId}/unlock`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ confirm: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: user.password })
      .expect(201);
  });

  it('requires confirmation before changing account status', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${user.userId}/disable`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Missing confirmation' })
      .expect(400);
  });

  it('keeps audit logs and payments private to admins', async () => {
    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/payments')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);
  });

  it('does not expose payment authority or other users financial data', async () => {
    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: user.userId },
      select: { id: true },
    });

    const payment = await db.payment.create({
      data: {
        walletId: wallet.id,
        amount: 250_000,
        authority: `secret-authority-${user.userId}`,
        status: 'PENDING',
      },
    });

    const otherUser = await registerUser(app);
    const otherHistory = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(200);

    expect(
      otherHistory.body.items.some(
        (item: { amount: { toString(): string } | number }) =>
          Number(item.amount) === 1_000_000,
      ),
    ).toBe(false);

    const payments = await request(app.getHttpServer())
      .get('/admin/payments')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const listed = payments.body.items.find(
      (item: { id: string }) => item.id === payment.id,
    );
    expect(listed).toBeDefined();
    expect(listed).not.toHaveProperty('authority');

    const detail = await request(app.getHttpServer())
      .get(`/admin/payments/${payment.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(detail.body).not.toHaveProperty('authority');
    expect(detail.body.id).toBe(payment.id);

    await cleanupUser(db, otherUser.userId);
  });

  it('filters transactions by user and date window', async () => {
    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    const response = await request(app.getHttpServer())
      .get('/admin/transactions')
      .query({
        type: 'DEPOSIT',
        userId: user.userId,
        from,
        to,
      })
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(
      response.body.items.every(
        (item: { type: string; user: { id: string } }) =>
          item.type === 'DEPOSIT' && item.user.id === user.userId,
      ),
    ).toBe(true);
  });

  it('records an audit log when an admin signs in', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: admin.email, password: admin.password })
      .expect(201);

    const logs = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(
      logs.body.items.some(
        (item: { action: string; targetId: string }) =>
          item.action === 'ADMIN_LOGIN' && item.targetId === admin.userId,
      ),
    ).toBe(true);
  });
});
