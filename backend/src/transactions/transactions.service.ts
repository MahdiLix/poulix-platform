import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FinancialDestinationsService } from '../financial-destinations/financial-destinations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-logging/audit-log.service';
import { SecurityService } from '../security/security.service';
import { SpendingLimitsService } from '../spending-limits/spending-limits.service';
import type {
  Prisma,
  TransactionCategory,
  TransactionType,
} from '../generated/prisma/client';
import type { TransactionsQueryDto } from './dto/transactions-query.dto';

type WithdrawMetadata = {
  reason?: string;
  category?: TransactionCategory;
  envelopeId?: string;
};

type TransferMetadata = WithdrawMetadata & {
  scheduledPaymentExecutionId?: string;
};

const NON_ABUSIVE_FINANCIAL_FAILURES = new Set([
  'Spending limit exceeded',
  'Insufficient funds',
  'Insufficient envelope funds',
  'Too many failed financial attempts',
]);

function badRequestMessage(error: BadRequestException): string {
  const response = error.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (response && typeof response === 'object' && 'message' in response) {
    const message = (response as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0];
    }
  }
  return error.message;
}

function shouldRecordFailedFinancialAttempt(
  error: unknown,
): error is BadRequestException {
  if (!(error instanceof BadRequestException)) {
    return false;
  }
  return !NON_ABUSIVE_FINANCIAL_FAILURES.has(badRequestMessage(error));
}

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
    private readonly auditLogService: AuditLogService,
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
          select: { id: true, balance: true, currency: true },
        });

        if (!wallet) {
          throw new BadRequestException('Wallet not found');
        }

        let balance = wallet.balance;
        let envelopeBalance: Prisma.Decimal | undefined;

        if (metadata?.envelopeId) {
          const envelope = await tx.envelope.findUnique({
            where: { id: metadata.envelopeId },
            select: { userId: true, status: true },
          });
          if (!envelope || envelope.userId !== userId) {
            throw new BadRequestException('Envelope not found');
          }
          if (envelope.status !== 'ACTIVE') {
            throw new BadRequestException('Envelope is not active');
          }

          const [updatedEnvelope] = await tx.envelope.updateManyAndReturn({
            where: {
              id: metadata.envelopeId,
              userId,
              status: 'ACTIVE',
              allocatedAmount: { gte: amount },
            },
            data: { allocatedAmount: { decrement: amount } },
            select: { allocatedAmount: true },
          });
          if (!updatedEnvelope) {
            throw new BadRequestException('Insufficient envelope funds');
          }
          envelopeBalance = updatedEnvelope.allocatedAmount;
        } else {
          const [updatedWallet] = await tx.wallet.updateManyAndReturn({
            where: {
              id: wallet.id,
              balance: { gte: amount },
            },
            data: {
              balance: { decrement: amount },
            },
            select: {
              balance: true,
            },
          });

          if (!updatedWallet) {
            throw new BadRequestException('Insufficient funds');
          }
          balance = updatedWallet.balance;
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: 'WITHDRAWAL',
            reason,
            category,
            envelopeId: metadata?.envelopeId,
          },
        });

        return {
          balance,
          currency: wallet.currency,
          ...(metadata?.envelopeId
            ? {
                fundingSource: 'ENVELOPE' as const,
                envelopeId: metadata.envelopeId,
                envelopeBalance,
              }
            : { fundingSource: 'WALLET' as const }),
        };
      });

      this.auditLogService.log({
        event: 'withdrawal.completed',
        action: 'complete',
        result: 'success',
        userId,
        resourceType: 'transaction',
        metadata: { amount, currency: updatedWallet.currency },
      });

      try {
        await this.notificationsService.createWithdrawalSuccess(userId, {
          amount,
          currency: updatedWallet.currency,
        });
      } catch {
        // Withdrawal already committed.
      }

      return updatedWallet;
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (shouldRecordFailedFinancialAttempt(error)) {
          void this.securityService.recordFailedWithdrawal(userId, {
            reason: badRequestMessage(error),
          });
        }
        this.auditLogService.log({
          event: 'withdrawal.failed',
          action: 'complete',
          result: 'failure',
          userId,
          resourceType: 'transaction',
          metadata: { amount, reason: badRequestMessage(error) },
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

  async getWalletTransactions(userId: string, query: TransactionsQueryDto) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = query.q?.trim();
    const typeFilter =
      query.type === 'GOALS'
        ? {
            type: {
              in: ['GOAL_CONTRIBUTE', 'GOAL_RELEASE'] as TransactionType[],
            },
          }
        : query.type === 'ENVELOPES'
          ? {
              type: {
                in: [
                  'ENVELOPE_ALLOCATE',
                  'ENVELOPE_RELEASE',
                ] as TransactionType[],
              },
            }
          : query.type
            ? { type: query.type }
            : {};
    const where: Prisma.TransactionWhereInput = {
      walletId: wallet.id,
      ...typeFilter,
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: 'insensitive' } },
              { reason: { contains: q, mode: 'insensitive' } },
              {
                counterpartyUser: {
                  is: {
                    OR: [
                      { username: { contains: q, mode: 'insensitive' } },
                      { email: { contains: q, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.db.$transaction([
      this.db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          counterpartyUser: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      }),
      this.db.transaction.count({ where }),
    ]);

    return { items, page, pageSize, total };
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
            envelopeId: metadata?.envelopeId,
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

      this.auditLogService.log({
        event: 'transfer.completed',
        action: 'complete',
        result: 'success',
        userId: senderUserId,
        resourceType: 'transaction',
        resourceId: result.transfer.outTransactionId,
        metadata: { amount, currency: result.currency },
      });

      if (!metadata?.scheduledPaymentExecutionId) {
        try {
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
        } catch {
          // Transfer already committed.
        }
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (shouldRecordFailedFinancialAttempt(error)) {
          void this.securityService.recordFailedTransfer(senderUserId, {
            reason: badRequestMessage(error),
          });
        }
        this.auditLogService.log({
          event: 'transfer.failed',
          action: 'complete',
          result: 'failure',
          userId: senderUserId,
          resourceType: 'transaction',
          metadata: { amount, reason: badRequestMessage(error) },
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
    const envelopeId = metadata?.envelopeId;

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

    if (envelopeId) {
      const envelope = await tx.envelope.findUnique({
        where: { id: envelopeId },
        select: { userId: true, status: true },
      });
      if (!envelope || envelope.userId !== senderUserId) {
        return { success: false, reason: 'Envelope not found' };
      }
      if (envelope.status !== 'ACTIVE') {
        return { success: false, reason: 'Envelope is not active' };
      }
      const funded = await tx.envelope.updateMany({
        where: {
          id: envelopeId,
          userId: senderUserId,
          status: 'ACTIVE',
          allocatedAmount: { gte: amount },
        },
        data: { allocatedAmount: { decrement: amount } },
      });
      if (funded.count !== 1) {
        return { success: false, reason: 'Insufficient envelope funds' };
      }
    } else {
      const updatedSenderWallet = await tx.wallet.updateMany({
        where: {
          id: senderWallet.id,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (updatedSenderWallet.count !== 1) {
        return { success: false, reason: 'Insufficient funds' };
      }
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
        envelopeId,
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
