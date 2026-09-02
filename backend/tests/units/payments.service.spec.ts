import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { PaymentsService } from '../../src/payments/payments.service';
import type { DatabaseService } from '../../src/database/database.service';
import type { ZarinpalService } from '../../src/payments/zarinpal.service';
import type { NotificationsService } from '../../src/notifications/notifications.service';

function createMockDb() {
  const paymentStore = {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  };

  const walletStore = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const transactionStore = {
    create: jest.fn(),
  };

  const userStore = {
    findUnique: jest.fn(),
  };

  const db = {
    payment: paymentStore,
    wallet: walletStore,
    transaction: transactionStore,
    user: userStore,
    $transaction: jest.fn(),
  } as unknown as DatabaseService & {
    payment: typeof paymentStore;
    wallet: typeof walletStore;
    transaction: typeof transactionStore;
    user: typeof userStore;
    $transaction: jest.Mock;
  };

  return db;
}

function createMockZarinpal() {
  return {
    requestPayment: jest.fn(),
    verifyPayment: jest.fn(),
  } as unknown as jest.Mocked<ZarinpalService>;
}

function createMockNotifications() {
  return {
    createDepositSuccess: jest.fn(),
  } as unknown as NotificationsService;
}

describe('PaymentsService', () => {
  describe('createDeposit', () => {
    it('creates a PENDING payment and does not change wallet balance', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.wallet.findUnique = jest.fn().mockResolvedValue({ id: 'wallet-1' });
      db.user.findUnique = jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' });
      db.payment.create = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        status: 'PENDING',
      });
      db.payment.update = jest.fn().mockResolvedValue({});
      zarinpal.requestPayment.mockResolvedValue({
        authority: 'Sauthority123',
        paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/Sauthority123',
      });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.createDeposit('user-1', 1_000_000);

      expect(db.payment.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          amount: 1_000_000,
          status: 'PENDING',
        },
      });
      expect(db.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { authority: 'Sauthority123' },
      });
      expect(zarinpal.requestPayment).toHaveBeenCalledWith({
        amount: 1_000_000,
        description: 'Wallet deposit payment-1',
        callbackOrderId: 'payment-1',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        paymentId: 'payment-1',
        authority: 'Sauthority123',
        paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/Sauthority123',
        amount: 1_000_000,
      });
      expect(db.wallet.update).not.toHaveBeenCalled();
    });

    it('requests ZarinPal using the stored Payment amount', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.wallet.findUnique = jest.fn().mockResolvedValue({ id: 'wallet-1' });
      db.user.findUnique = jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' });
      db.payment.create = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(250_000),
        status: 'PENDING',
      });
      db.payment.update = jest.fn().mockResolvedValue({});
      zarinpal.requestPayment.mockResolvedValue({
        authority: 'Sauthority123',
        paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/Sauthority123',
      });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.createDeposit('user-1', 250_000);

      expect(zarinpal.requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 250_000 }),
      );
      expect(result.amount).toBe(250_000);
    });

    it('marks the payment FAILED when ZarinPal request fails', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.wallet.findUnique = jest.fn().mockResolvedValue({ id: 'wallet-1' });
      db.user.findUnique = jest
        .fn()
        .mockResolvedValue({ email: 'user@example.com' });
      db.payment.create = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        status: 'PENDING',
      });
      db.payment.update = jest.fn().mockResolvedValue({});
      zarinpal.requestPayment.mockRejectedValue(
        new BadRequestException('Failed to create ZarinPal payment request'),
      );

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );

      await expect(service.createDeposit('user-1', 1_000_000)).rejects.toThrow(
        BadRequestException,
      );
      expect(db.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('handleCallback', () => {
    it('requires authority', async () => {
      const service = new PaymentsService(
        createMockDb(),
        createMockZarinpal(),
        createMockNotifications(),
      );
      await expect(service.handleCallback(undefined, 'OK')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unknown authority', async () => {
      const db = createMockDb();
      db.payment.findUnique = jest.fn().mockResolvedValue(null);
      const service = new PaymentsService(
        db,
        createMockZarinpal(),
        createMockNotifications(),
      );

      await expect(service.handleCallback('Sunknown', 'OK')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cancels a pending payment on non-OK status without verifying', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      db.payment.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.handleCallback('Sauthority123', 'NOK');

      expect(result.status).toBe('NOK');
      expect(zarinpal.verifyPayment).not.toHaveBeenCalled();
      expect(db.payment.updateMany).not.toHaveBeenCalled();
    });

    it('verifies using amount from the stored payment', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: 100, refId: '201' });
      db.$transaction = jest.fn(async (callback) =>
        callback({
          payment: {
            updateManyAndReturn: jest.fn().mockResolvedValue([
              {
                walletId: 'wallet-1',
                amount: new Decimal(1_000_000),
                refId: '201',
              },
            ]),
            findUnique: jest.fn(),
          },
          wallet: {
            update: jest.fn().mockResolvedValue({
              balance: new Decimal(1_000_000),
              currency: 'IRR',
            }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      await service.handleCallback('Sauthority123', 'OK');

      expect(zarinpal.verifyPayment).toHaveBeenCalledWith({
        amount: 1_000_000,
        authority: 'Sauthority123',
      });
    });

    it('verifies and settles using the stored Payment authority, not a callback-only value', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();
      const txPayment = {
        updateManyAndReturn: jest.fn().mockResolvedValue([
          {
            walletId: 'wallet-1',
            amount: new Decimal(1_000_000),
            refId: '201',
          },
        ]),
        findUnique: jest.fn(),
      };

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'STORED_AUTHORITY',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: 100, refId: '201' });
      db.$transaction = jest.fn(async (callback) =>
        callback({
          payment: txPayment,
          wallet: {
            update: jest.fn().mockResolvedValue({
              balance: new Decimal(1_000_000),
              currency: 'IRR',
            }),
          },
          transaction: { create: jest.fn().mockResolvedValue({}) },
        }),
      );

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      await service.handleCallback('CALLBACK_AUTHORITY', 'OK');

      expect(zarinpal.verifyPayment).toHaveBeenCalledWith({
        amount: 1_000_000,
        authority: 'STORED_AUTHORITY',
      });
      expect(txPayment.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authority: 'STORED_AUTHORITY', status: 'PENDING' },
        }),
      );
    });

    it('does not verify an already PAID payment', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PAID',
        refId: '201',
      });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.handleCallback('Sauthority123', 'OK');

      expect(result).toEqual({
        status: 'PAID',
        alreadyVerified: true,
        authority: 'Sauthority123',
        refId: '201',
      });
      expect(zarinpal.verifyPayment).not.toHaveBeenCalled();
    });

    it('marks payment FAILED when verification returns an unsuccessful code', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: -9 });
      db.payment.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );

      await expect(
        service.handleCallback('Sauthority123', 'OK'),
      ).rejects.toThrow(BadRequestException);
      expect(db.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('settlement', () => {
    it('credits wallet and creates exactly one DEPOSIT transaction atomically', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();
      const txPayment = {
        updateManyAndReturn: jest.fn().mockResolvedValue([
          {
            walletId: 'wallet-1',
            amount: new Decimal(1_000_000),
            refId: '201',
          },
        ]),
        findUnique: jest.fn(),
      };
      const txWallet = {
        update: jest.fn().mockResolvedValue({
          balance: new Decimal(1_000_000),
          currency: 'IRR',
        }),
      };
      const txTransaction = {
        create: jest.fn().mockResolvedValue({}),
      };

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: 100, refId: '201' });
      db.$transaction = jest.fn(async (callback) =>
        callback({
          payment: txPayment,
          wallet: txWallet,
          transaction: txTransaction,
        }),
      );

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.handleCallback('Sauthority123', 'OK');

      expect(txPayment.updateManyAndReturn).toHaveBeenCalledWith({
        where: { authority: 'Sauthority123', status: 'PENDING' },
        data: { status: 'PAID', refId: '201' },
        select: { walletId: true, amount: true, refId: true },
      });
      expect(txWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: new Decimal(1_000_000) } },
        select: { userId: true, balance: true, currency: true },
      });
      expect(txTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          amount: new Decimal(1_000_000),
          type: 'DEPOSIT',
        },
      });
      expect(result.status).toBe('PAID');
      expect(result.alreadyVerified).toBe(false);
    });

    it('does not credit again when payment is already settled', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();
      const txPayment = {
        updateManyAndReturn: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          status: 'PAID',
          refId: '201',
        }),
      };

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: 101, refId: '201' });
      db.$transaction = jest.fn(async (callback) =>
        callback({
          payment: txPayment,
          wallet: { update: jest.fn() },
          transaction: { create: jest.fn() },
        }),
      );

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );
      const result = await service.handleCallback('Sauthority123', 'OK');

      expect(result).toEqual({
        status: 'PAID',
        alreadyVerified: true,
        authority: 'Sauthority123',
        refId: '201',
      });
      expect(txPayment.findUnique).toHaveBeenCalled();
    });

    it('rolls back settlement when transaction creation fails', async () => {
      const db = createMockDb();
      const zarinpal = createMockZarinpal();

      db.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'payment-1',
        walletId: 'wallet-1',
        amount: new Decimal(1_000_000),
        authority: 'Sauthority123',
        status: 'PENDING',
        refId: null,
      });
      zarinpal.verifyPayment.mockResolvedValue({ code: 100, refId: '201' });
      db.$transaction = jest.fn(async (callback) => {
        const tx = {
          payment: {
            updateManyAndReturn: jest.fn().mockResolvedValue([
              {
                walletId: 'wallet-1',
                amount: new Decimal(1_000_000),
                refId: '201',
              },
            ]),
            findUnique: jest.fn(),
          },
          wallet: {
            update: jest.fn().mockResolvedValue({
              balance: new Decimal(1_000_000),
              currency: 'IRR',
            }),
          },
          transaction: {
            create: jest
              .fn()
              .mockRejectedValue(new Error('transaction create failed')),
          },
        };
        return callback(tx);
      });

      const service = new PaymentsService(
        db,
        zarinpal,
        createMockNotifications(),
      );

      await expect(
        service.handleCallback('Sauthority123', 'OK'),
      ).rejects.toThrow('transaction create failed');
      expect(db.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
