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

describe('Envelopes API', () => {
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

  async function createEnvelope(name = 'Food') {
    const response = await request(app.getHttpServer())
      .post('/envelopes')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name,
        description: 'Monthly food budget',
      })
      .expect(201);

    return response.body;
  }

  it('creates an envelope with zero allocated balance', async () => {
    const envelope = await createEnvelope();

    expect(envelope.name).toBe('Food');
    expect(envelope.status).toBe('ACTIVE');
    expect(balanceOf(envelope.allocatedAmount)).toBe(0);
    expect(envelope.description).toBe('Monthly food budget');
  });

  it('allocates wallet funds into an envelope atomically', async () => {
    const envelope = await createEnvelope();

    const response = await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 350_000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(1_650_000);
    expect(balanceOf(response.body.envelope.allocatedAmount)).toBe(350_000);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(1_650_000);

    const transactions = await db.transaction.findMany({
      where: { walletId: wallet.id, type: 'ENVELOPE_ALLOCATE' },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0].envelopeId).toBe(envelope.id);
  });

  it('releases funds from an envelope back to the wallet', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 500_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/release`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 150_000 })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(1_650_000);
    expect(balanceOf(response.body.envelope.allocatedAmount)).toBe(350_000);
  });

  it('rejects allocation that exceeds wallet balance', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 3_000_000 })
      .expect(400);

    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: session.userId },
    });
    expect(balanceOf(wallet.balance)).toBe(2_000_000);
  });

  it('rejects release that exceeds envelope balance', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 100_000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/release`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 200_000 })
      .expect(400);
  });

  it('lists envelopes with allocated totals summary', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 200_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/envelopes')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.envelopes).toHaveLength(1);
    expect(balanceOf(response.body.summary.totalAllocatedInEnvelopes)).toBe(
      200_000,
    );
  });

  it('returns movement history on envelope details', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 120_000 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/envelopes/${envelope.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(response.body.movements).toHaveLength(1);
    expect(response.body.movements[0].type).toBe('ALLOCATE');
    expect(balanceOf(response.body.movements[0].amount)).toBe(120_000);
  });

  it('rejects cancelling an envelope with remaining balance', async () => {
    const envelope = await createEnvelope();

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/allocate`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ amount: 50_000 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/envelopes/${envelope.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(400);
  });

  it('rejects unauthenticated envelope access', async () => {
    await request(app.getHttpServer()).get('/envelopes').expect(401);
  });
});
