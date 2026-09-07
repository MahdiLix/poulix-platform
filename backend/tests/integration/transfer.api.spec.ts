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

describe('P2P Transfer API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let sender: AuthSession;
  let recipient: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  beforeEach(async () => {
    sender = await registerUser(app);
    recipient = await registerUser(app);
    await creditWallet(db, sender.userId, 1_000_000);
  });

  afterEach(async () => {
    await cleanupUser(db, sender.userId);
    await cleanupUser(db, recipient.userId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('transfers funds to another user and updates both balances atomically', async () => {
    const response = await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 350_000,
      })
      .expect(201);

    expect(balanceOf(response.body.balance)).toBe(650_000);
    expect(response.body.recipient.username).toBe(recipient.username);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const recipientWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: recipient.userId },
    });

    expect(balanceOf(senderWallet.balance)).toBe(650_000);
    expect(balanceOf(recipientWallet.balance)).toBe(350_000);

    const outTx = await db.transaction.findFirstOrThrow({
      where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
    });
    const inTx = await db.transaction.findFirstOrThrow({
      where: { walletId: recipientWallet.id, type: 'TRANSFER_IN' },
    });

    expect(balanceOf(outTx.amount)).toBe(350_000);
    expect(balanceOf(inTx.amount)).toBe(350_000);
    expect(outTx.counterpartyUserId).toBe(recipient.userId);
    expect(inTx.counterpartyUserId).toBe(sender.userId);
    expect(outTx.relatedTransactionId).toBe(inTx.id);
    expect(inTx.relatedTransactionId).toBe(outTx.id);
  });

  it('stores optional reason and category on both transfer transactions', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.email,
        amount: 100_000,
        reason: 'Monthly support',
        category: 'FAMILY_SUPPORT',
      })
      .expect(201);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const recipientWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: recipient.userId },
    });

    const outTx = await db.transaction.findFirstOrThrow({
      where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
    });
    const inTx = await db.transaction.findFirstOrThrow({
      where: { walletId: recipientWallet.id, type: 'TRANSFER_IN' },
    });

    expect(outTx.reason).toBe('Monthly support');
    expect(outTx.category).toBe('FAMILY_SUPPORT');
    expect(inTx.reason).toBe('Monthly support');
    expect(inTx.category).toBe('FAMILY_SUPPORT');
  });

  it('paginates and filters the authenticated user transaction history', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 100_000,
        reason: 'Filtered support',
        category: 'FAMILY_SUPPORT',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(
        '/transactions?page=1&pageSize=1&type=TRANSFER_OUT&category=FAMILY_SUPPORT&q=Filtered',
      )
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 1, pageSize: 1, total: 1 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].type).toBe('TRANSFER_OUT');
  });

  it('rejects a transfer that exceeds the available balance', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 1_500_000,
      })
      .expect(400);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const recipientWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: recipient.userId },
    });

    expect(balanceOf(senderWallet.balance)).toBe(1_000_000);
    expect(balanceOf(recipientWallet.balance)).toBe(0);

    const transfers = await db.transaction.findMany({
      where: {
        walletId: { in: [senderWallet.id, recipientWallet.id] },
        type: { in: ['TRANSFER_OUT', 'TRANSFER_IN'] },
      },
    });
    expect(transfers).toHaveLength(0);
  });

  it('rejects self transfers', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: sender.username,
        amount: 100_000,
      })
      .expect(400);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(1_000_000);
  });

  it('rejects transfers to unknown recipients', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: 'nobody_here_12345',
        amount: 100_000,
      })
      .expect(400);
  });

  it('rejects unauthenticated transfers', async () => {
    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .send({
        recipient: recipient.username,
        amount: 100_000,
      })
      .expect(401);
  });

  it('looks up a valid recipient by username', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/lookup?identifier=${encodeURIComponent(recipient.username)}`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(response.body.found).toBe(true);
    expect(response.body.user.username).toBe(recipient.username);
    expect(response.body.user.email).toBe(recipient.email);
  });

  it('returns not found for invalid lookup identifiers', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/lookup?identifier=missing_user_xyz')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(response.body.found).toBe(false);
  });

  it('marks self lookup as not found', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/lookup?identifier=${encodeURIComponent(sender.username)}`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);

    expect(response.body.found).toBe(false);
    expect(response.body.self).toBe(true);
  });

  it('prevents concurrent transfers from overdrawing the same balance', async () => {
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/wallets/transfer')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({
          recipient: recipient.username,
          amount: 700_000,
        }),
      request(app.getHttpServer())
        .post('/wallets/transfer')
        .set('Authorization', `Bearer ${sender.accessToken}`)
        .send({
          recipient: recipient.username,
          amount: 700_000,
        }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 400]);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(300_000);

    const outTransfers = await db.transaction.findMany({
      where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
    });
    expect(outTransfers).toHaveLength(1);
  });

  it('funds a transfer from an owned envelope without debiting the wallet', async () => {
    const envelope = await db.envelope.create({
      data: {
        userId: sender.userId,
        name: 'Support',
        allocatedAmount: 600_000,
      },
    });

    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 500_000,
        envelopeId: envelope.id,
      })
      .expect(201);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const updatedEnvelope = await db.envelope.findUniqueOrThrow({
      where: { id: envelope.id },
    });
    const outTransaction = await db.transaction.findFirstOrThrow({
      where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
    });

    expect(balanceOf(senderWallet.balance)).toBe(1_000_000);
    expect(balanceOf(updatedEnvelope.allocatedAmount)).toBe(100_000);
    expect(outTransaction.envelopeId).toBe(envelope.id);
  });

  it('rejects a foreign funding envelope and rolls back the transfer', async () => {
    const foreignEnvelope = await db.envelope.create({
      data: {
        userId: recipient.userId,
        name: 'Private',
        allocatedAmount: 900_000,
      },
    });

    await request(app.getHttpServer())
      .post('/wallets/transfer')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .send({
        recipient: recipient.username,
        amount: 200_000,
        envelopeId: foreignEnvelope.id,
      })
      .expect(400);

    const senderWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: sender.userId },
    });
    const recipientWallet = await db.wallet.findUniqueOrThrow({
      where: { userId: recipient.userId },
    });
    expect(balanceOf(senderWallet.balance)).toBe(1_000_000);
    expect(balanceOf(recipientWallet.balance)).toBe(0);
    expect(
      await db.transaction.count({
        where: { walletId: senderWallet.id, type: 'TRANSFER_OUT' },
      }),
    ).toBe(0);
  });
});
