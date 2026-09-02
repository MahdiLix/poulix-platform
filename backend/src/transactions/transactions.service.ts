import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FinancialDestinationsService } from '../financial-destinations/financial-destinations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityService } from '../security/security.service';
import { SpendingLimitsService } from '../spending-limits/spending-limits.service';
import type { Prisma, TransactionCategory } from '../generated/prisma/client';

type WithdrawMetadata = {
  reason?: string;
  category?: TransactionCategory;
};

type TransferMetadata = WithdrawMetadata & {
  scheduledPaymentExecutionId?: string;
};

export type TransferInTxResult =
  | {
      success: true;
      outTransactionId: string;
      inTransactionId: string;
    }
  | {
      success: false;
      reason: string;
    };

@Injectable()
export class TransactionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly spendingLimitsService: SpendingLimitsService,
    private readonly financialDestinationsService: FinancialDestinationsService,
    private readonly securityService: SecurityService,
  ) {}

  async withdraw(userId: string, amount: number, metadata?: WithdrawMetadata) {
    const reason = metadata?.reason?.trim() || undefined;
    const category = metadata?.category;

    try {
      await this.securityService.assertOperationAllowed(userId);

      const updatedWallet = await this.db.$transaction(async (tx) => {
        await this.spendingLimitsService.assertWithinLimitsInTx(
          tx,
          userId,
          'withdrawal',
          amount,
        );

        const wallet = await tx.wallet.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!wallet) {
          throw new BadRequestException('Wallet not found');
        }

        const [result] = await tx.wallet.updateManyAndReturn({
          where: {
            id: wallet.id,
            balance: { gte: amount },
          },
          data: {
            balance: { decrement: amount },
          },
          select: {
            balance: true,
            currency: true,
          },
        });

        if (!result) {
          throw new BadRequestException('Insufficient funds');
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: 'WITHDRAWAL',
            reason,
            category,
          },
        });

        return result;
      });

      await this.notificationsService.createWithdrawalSuccess(userId, {
        amount,
        currency: updatedWallet.currency,
      });

      return updatedWallet;
    } catch (error) {
      if (error instanceof BadRequestException) {
        void this.securityService.recordFailedWithdrawal(userId, {
          reason: error.message,
        });
      }
      throw error;
    }
  }

  async deposit(userId: string, amount: number) {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
        select: {
          balance: true,
          currency: true,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'DEPOSIT',
        },
      });

      return updatedWallet;
    });
  }

  async getWalletTransactions(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    return this.db.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      include: {
        counterpartyUser: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });
  }

  async transferToUser(
    senderUserId: string,
    recipientIdentifier: string,
    amount: number,
    metadata?: TransferMetadata,
  ) {
    const trimmedIdentifier = recipientIdentifier.trim();
    if (!trimmedIdentifier) {
      throw new BadRequestException('Recipient is required');
    }

    const recipient = await this.db.user.findFirst({
      where: {
        OR: [{ email: trimmedIdentifier }, { username: trimmedIdentifier }],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!recipient) {
      throw new BadRequestException('Recipient not found');
    }

    if (recipient.id === senderUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    const reason = metadata?.reason?.trim() || undefined;
    const category = metadata?.category;

    const sender = await this.db.user.findUnique({
      where: { id: senderUserId },
      select: { username: true },
    });

    try {
      await this.securityService.assertOperationAllowed(senderUserId);

      const result = await this.db.$transaction(async (tx) => {
        await this.spendingLimitsService.assertWithinLimitsInTx(
          tx,
          senderUserId,
          'transfer',
          amount,
        );

        const transferResult = await this.transferInTx(
          tx,
          senderUserId,
          recipient.id,
          amount,
          {
            reason,
            category,
            scheduledPaymentExecutionId: metadata?.scheduledPaymentExecutionId,
          },
        );

        if (!transferResult.success) {
          throw new BadRequestException(transferResult.reason);
        }

        const updatedSenderWallet = await tx.wallet.findUniqueOrThrow({
          where: { userId: senderUserId },
          select: { balance: true, currency: true },
        });

        return {
          balance: updatedSenderWallet.balance,
          currency: updatedSenderWallet.currency,
          recipient: {
            id: recipient.id,
            username: recipient.username,
            email: recipient.email,
          },
          transfer: {
            outTransactionId: transferResult.outTransactionId,
            inTransactionId: transferResult.inTransactionId,
          },
        };
      });

      if (!metadata?.scheduledPaymentExecutionId) {
        await this.notificationsService.createTransferSuccess(senderUserId, {
          amount,
          currency: result.currency,
          recipientUsername: recipient.username,
        });
        await this.notificationsService.createTransferReceived(recipient.id, {
          amount,
          currency: result.currency,
          senderUsername: sender?.username ?? 'user',
        });
        await this.financialDestinationsService.recordP2PRecipient(
          senderUserId,
          {
            recipientUserId: recipient.id,
            recipientUsername: recipient.username,
          },
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        void this.securityService.recordFailedTransfer(senderUserId, {
          reason: error.message,
        });
      }
      throw error;
    }
  }

  async transferInTx(
    tx: Prisma.TransactionClient,
    senderUserId: string,
    recipientUserId: string,
    amount: number,
    metadata?: TransferMetadata,
  ): Promise<TransferInTxResult> {
    if (recipientUserId === senderUserId) {
      return { success: false, reason: 'Cannot transfer to yourself' };
    }

    const reason = metadata?.reason?.trim() || undefined;
    const category = metadata?.category;
    const scheduledPaymentExecutionId = metadata?.scheduledPaymentExecutionId;

    const senderWallet = await tx.wallet.findUnique({
      where: { userId: senderUserId },
      select: { id: true },
    });

    const recipientWallet = await tx.wallet.findUnique({
      where: { userId: recipientUserId },
      select: { id: true },
    });

    if (!senderWallet || !recipientWallet) {
      return { success: false, reason: 'Wallet not found' };
    }

    const [updatedSenderWallet] = await tx.wallet.updateManyAndReturn({
      where: {
        id: senderWallet.id,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
      select: { id: true },
    });

    if (!updatedSenderWallet) {
      return { success: false, reason: 'Insufficient funds' };
    }

    await tx.wallet.update({
      where: { id: recipientWallet.id },
      data: {
        balance: { increment: amount },
      },
    });

    const outTransaction = await tx.transaction.create({
      data: {
        walletId: senderWallet.id,
        amount,
        type: 'TRANSFER_OUT',
        reason,
        category,
        counterpartyUserId: recipientUserId,
        scheduledPaymentExecutionId,
      },
    });

    const inTransaction = await tx.transaction.create({
      data: {
        walletId: recipientWallet.id,
        amount,
        type: 'TRANSFER_IN',
        reason,
        category,
        counterpartyUserId: senderUserId,
        relatedTransactionId: outTransaction.id,
      },
    });

    await tx.transaction.update({
      where: { id: outTransaction.id },
      data: {
        relatedTransactionId: inTransaction.id,
      },
    });

    return {
      success: true,
      outTransactionId: outTransaction.id,
      inTransactionId: inTransaction.id,
    };
  }
}
