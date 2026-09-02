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
import { ScheduledPaymentsService } from '../../src/scheduled-payments/scheduled-payments.service';

describe('Scheduled Payments API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let scheduler: ScheduledPaymentsService;
  let sender: AuthSession;
  let recipient: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
    scheduler = app.get(ScheduledPaymentsService);
  });

  beforeEach(async () => {
    sender = await registerUser(app);
    recipient = await registerUser(app);
    await creditWallet(db, sender.userId, 5_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, sender.userId);
    await cleanupUser(db, recipient.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createScheduledPayment(
    overrides: Record<string, unknown> = {},
  ) {
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 5);

    const response = await request(app.getHttpServer())
      .post('/scheduled-payments')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 500_000,
        frequency: 'MONTHLY',
        startDate: startDate.toISOString(),
        reason: 'Family support',
        category: 'FAMILY_SUPPORT',
        ...overrides,
      })
      .expect(201);

    return response.body;
  }

  it('creates a scheduled payment with recipient and schedule details', async () => {
    const payment = await createScheduledPayment();

    expect(payment.status).toBe('ACTIVE');
    expect(balanceOf(payment.amount)).toBe(500_000);
    expect(payment.frequency).toBe('MONTHLY');
    expect(payment.recipientUser.username).toBe(recipient.username);
    expect(payment.reason).toBe('Family support');
    expect(payment.category).toBe('FAMILY_SUPPORT');
  });

  it('executes a due scheduled payment once and records execution history', async () => {
    const payment = await createScheduledPayment({ frequency: 'ONCE' });

    await scheduler.processDuePayments();

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const recipientWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: recipient.userId },
    });

    expect(balanceOf(senderWallet.balance)).toBe(4_500_000);
    expect(balanceOf(recipientWallet.balance)).toBe(500_000);

    const updated = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });

    expect(updated.status).toBe('COMPLETED');
    expect(updated.executions).toHaveLength(1);
    expect(updated.executions[0].status).toBe('SUCCESS');

    const transfers = await db.transaction.findMany({
      where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
    });
    expect(transfers).toHaveLength(1);
    expect(transfers[0].scheduledPaymentExecutionId).toBe(
      updated.executions[0].id,
    );

    await scheduler.processDuePayments();

    const afterSecondRun = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });
    expect(afterSecondRun.executions).toHaveLength(1);
    expect(balanceOf(senderWallet.balance)).toBe(4_500_000);
  });

  it('records a failed execution when balance is insufficient without double charging', async () => {
    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });

    await db.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: 100_000 },
    });

    const payment = await createScheduledPayment({
      amount: 500_000,
      frequency: 'ONCE',
    });

    await scheduler.processDuePayments();

    const walletAfter = await db.wallet.findUniqueOrThrow({
      where: { id: senderWallet.id },
    });
    expect(balanceOf(walletAfter.balance)).toBe(100_000);

    const updated = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });

    expect(updated.status).toBe('FAILED');
    expect(updated.executions).toHaveLength(1);
    expect(updated.executions[0].status).toBe('FAILED');
    expect(updated.executions[0].failureReason).toBe('Insufficient funds');
  });

  it('pauses and resumes a scheduled payment', async () => {
    const payment = await createScheduledPayment();

    await request(app.getHttpServer())
      .post(`/scheduled-payments/${payment.id}/pause`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('PAUSED');
      });

    await scheduler.processDuePayments();

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(5_000_000);

    await request(app.getHttpServer())
      .post(`/scheduled-payments/${payment.id}/resume`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('ACTIVE');
      });
  });

  it('cancels a scheduled payment', async () => {
    const payment = await createScheduledPayment();

    await request(app.getHttpServer())
      .post(`/scheduled-payments/${payment.id}/cancel`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('CANCELLED');
      });

    await scheduler.processDuePayments();

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(5_000_000);
  });

  it('lists scheduled payments and returns execution history for details', async () => {
    const payment = await createScheduledPayment({ frequency: 'ONCE' });
    await scheduler.processDuePayments();

    const listResponse = await request(app.getHttpServer())
      .get('/scheduled-payments')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0].id).toBe(payment.id);

    const detailResponse = await request(app.getHttpServer())
      .get(`/scheduled-payments/${payment.id}`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(detailResponse.body.executions).toHaveLength(1);
    expect(detailResponse.body.executions[0].status).toBe('SUCCESS');
  });

  it('rejects self-transfer scheduled payments', async () => {
    await request(app.getHttpServer())
      .post('/scheduled-payments')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: sender.username,
        amount: 100_000,
        frequency: 'ONCE',
        startDate: new Date().toISOString(),
      })
      .expect(400);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/scheduled-payments').expect(401);
  });

  it('does not execute scheduled payments for a disabled owner', async () => {
    const payment = await createScheduledPayment({ frequency: 'ONCE' });

    await db.user.update({
      where: { id: sender.userId },
      data: { status: 'DISABLED' },
    });

    await scheduler.processDuePayments();

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(5_000_000);

    const updated = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });
    expect(updated.status).toBe('ACTIVE');
    expect(updated.executions).toHaveLength(0);
  });

  it('records a failed execution when a spending limit is exceeded', async () => {
    await request(app.getHttpServer())
      .put('/spending-limits')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({ type: 'DAILY_TRANSFER', maxAmount: 1_000 })
      .expect(200);

    const payment = await createScheduledPayment({
      amount: 500_000,
      frequency: 'ONCE',
    });

    await scheduler.processDuePayments();

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(5_000_000);

    const updated = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });
    expect(updated.status).toBe('FAILED');
    expect(updated.executions).toHaveLength(1);
    expect(updated.executions[0].status).toBe('FAILED');
    expect(updated.executions[0].failureReason).toBe('Spending limit exceeded');
  });

  it('retries a failed recurring payment without advancing the schedule', async () => {
    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    await db.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: 100_000 },
    });

    const payment = await createScheduledPayment({
      amount: 500_000,
      frequency: 'MONTHLY',
    });
    const originalNext = new Date(payment.nextExecutionAt);

    await scheduler.processDuePayments();

    const failed = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });
    expect(failed.status).toBe('ACTIVE');
    expect(new Date(failed.nextExecutionAt).getTime()).toBe(
      originalNext.getTime(),
    );
    expect(failed.executions).toHaveLength(1);
    expect(failed.executions[0].status).toBe('FAILED');

    await db.wallet.update({
      where: { id: senderWallet.id },
      data: { balance: 5_000_000 },
    });

    await scheduler.processDuePayments();

    const succeeded = await db.scheduledPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { executions: true },
    });
    expect(succeeded.executions).toHaveLength(1);
    expect(succeeded.executions[0].status).toBe('SUCCESS');
    expect(new Date(succeeded.nextExecutionAt).getTime()).toBeGreaterThan(
      originalNext.getTime(),
    );

    const walletAfter = await db.wallet.findUniqueOrThrow({
      where: { id: senderWallet.id },
    });
    expect(balanceOf(walletAfter.balance)).toBe(4_500_000);
  });
});
