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

describe('Goals API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let session: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    session = await registerUser(app);
    await creditWallet(db, session.userId, 2_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, session.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createGoal(targetAmount = 1_000_000) {
    const response = await request(app.getHttpServer())
      .post('/goals')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        title: 'MacBook',
        targetAmount,
        description: 'New laptop savings',
      })
      .expect(201);

    return response.body;
  }

  it('creates a goal with target amount and zero saved balance', async () => {
    const goal = await createGoal();

    expect(goal.title).toBe('MacBook');
    expect(goal.status).toBe('ACTIVE');
    expect(balanceOf(goal.targetAmount)).toBe(1_000_000);
    expect(balanceOf(goal.savedAmount)).toBe(0);
    expect(goal.description).toBe('New laptop savings');
  });

  it('contributes to a goal and decreases wallet balance without losing total wealth', async () => {
    const goal = await createGoal();

    const response = await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 400_000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(1_600_000);
    expect(balanceOf(response.body.goal.savedAmount)).toBe(400_000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(1_600_000);

    const transactions = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'GOAL_CONTRIBUTE' },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].goalId).toBe(goal.id);
  });

  it('marks a goal completed when the target amount is reached', async () => {
    const goal = await createGoal(500_000);

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 500_000 })
      .expect(201);

    const updated = await db.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(updated.status).toBe('COMPLETED');
    expect(balanceOf(updated.savedAmount)).toBe(500_000);
  });

  it('releases funds from a goal back to the wallet', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 300_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/goals/${goal.id}/release`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(1_800_000);
    expect(balanceOf(response.body.goal.savedAmount)).toBe(200_000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(1_800_000);
  });

  it('rejects contributions that exceed wallet balance', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 3_000_000 })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(2_000_000);
  });

  it('rejects releases that exceed saved goal balance', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/release`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 200_000 })
      .expect(400);
  });

  it('lists goals with saved totals summary', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 250_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/goals')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.goals).toHaveLength(1);
    expect(balanceOf(response.body.summary.totalSavedInGoals)).toBe(250_000);
  });

  it('returns contribution history on goal details', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 150_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/goals/${goal.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.contributions).toHaveLength(1);
    expect(response.body.contributions[0].type).toBe('CONTRIBUTE');
    expect(balanceOf(response.body.contributions[0].amount)).toBe(150_000);
  });

  it('releases funds after a goal is completed', async () => {
    const goal = await createGoal(500_000);

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 500_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/goals/${goal.id}/release`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 500_000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(2_000_000);
    expect(balanceOf(response.body.goal.savedAmount)).toBe(0);
  });

  it('returns saved funds to the wallet when a goal is cancelled', async () => {
    const goal = await createGoal();

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/contribute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 300_000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/goals/${goal.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(201);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(2_000_000);

    const updated = await db.goal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(updated.status).toBe('CANCELLED');
    expect(balanceOf(updated.savedAmount)).toBe(0);
  });
});
