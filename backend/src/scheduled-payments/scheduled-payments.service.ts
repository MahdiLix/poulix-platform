import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-logging/audit-log.service';
import { SpendingLimitsService } from '../spending-limits/spending-limits.service';
import { TransactionsService } from '../transactions/transactions.service';
import type { CreateScheduledPaymentDto } from './dto/create-scheduled-payment.dto';

function parseDateInput(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }
  return date;
}

function computeNextExecutionAt(
  from: Date,
  frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY',
): Date | null {
  if (frequency === 'ONCE') {
    return null;
  }

  if (frequency === 'WEEKLY') {
    const next = new Date(from);
    next.setDate(next.getDate() + 7);
    return next;
  }

  const next = new Date(from);
  const day = next.getDate();
  next.setMonth(next.getMonth() + 1);
  if (next.getDate() < day) {
    next.setDate(0);
  }
  return next;
}

@Injectable()
export class ScheduledPaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
    private readonly spendingLimitsService: SpendingLimitsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateScheduledPaymentDto) {
    const trimmedRecipient = dto.recipient.trim();
    if (!trimmedRecipient) {
      throw new BadRequestException('Recipient is required');
    }

    const recipient = await this.db.user.findFirst({
      where: {
        OR: [{ email: trimmedRecipient }, { username: trimmedRecipient }],
      },
      select: { id: true },
    });

    if (!recipient) {
      throw new BadRequestException('Recipient not found');
    }

    if (recipient.id === userId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    const startDate = parseDateInput(dto.startDate, 'start date');
    const endDate = dto.endDate
      ? parseDateInput(dto.endDate, 'end date')
      : undefined;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const reason = dto.reason?.trim() || undefined;

    return this.db.$transaction(async (tx) => {
      if (dto.envelopeId) {
        const envelope = await tx.envelope.findFirst({
          where: {
            id: dto.envelopeId,
            userId,
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        if (!envelope) {
          throw new BadRequestException('Active envelope not found');
        }
      }

      return tx.scheduledPayment.create({
        data: {
          userId,
          recipientUserId: recipient.id,
          envelopeId: dto.envelopeId,
          amount: dto.amount,
          reason,
          category: dto.category,
          frequency: dto.frequency,
          startDate,
          nextExecutionAt: startDate,
          endDate,
          status: 'ACTIVE',
        },
        include: this.defaultInclude(),
      });
    });
  }

  async listForUser(userId: string) {
    return this.db.scheduledPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.defaultInclude(),
    });
  }

  async getByIdForUser(userId: string, id: string) {
    const payment = await this.db.scheduledPayment.findFirst({
      where: { id, userId },
      include: {
        ...this.defaultInclude(),
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Scheduled payment not found');
    }

    return payment;
  }

  async pause(userId: string, id: string) {
    return this.updateStatus(userId, id, 'ACTIVE', 'PAUSED');
  }

  async resume(userId: string, id: string) {
    return this.updateStatus(userId, id, 'PAUSED', 'ACTIVE');
  }

  async cancel(userId: string, id: string) {
    const payment = await this.db.scheduledPayment.findFirst({
      where: { id, userId },
    });

    if (!payment) {
      throw new NotFoundException('Scheduled payment not found');
    }

    if (
      payment.status === 'COMPLETED' ||
      payment.status === 'CANCELLED' ||
      payment.status === 'FAILED'
    ) {
      throw new BadRequestException('Scheduled payment cannot be cancelled');
    }

    return this.db.scheduledPayment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.defaultInclude(),
    });
  }

  async processDuePayments(now = new Date()) {
    const duePayments = await this.db.scheduledPayment.findMany({
      where: {
        status: 'ACTIVE',
        nextExecutionAt: { lte: now },
        user: { status: 'ACTIVE' },
      },
      orderBy: { nextExecutionAt: 'asc' },
      take: 100,
    });

    let processed = 0;

    for (const payment of duePayments) {
      const didProcess = await this.processSinglePayment(payment.id, now);
      if (didProcess) {
        processed += 1;
      }
    }

    return { processed, checked: duePayments.length };
  }

  async processSinglePayment(scheduledPaymentId: string, now = new Date()) {
    type SuccessNotification = {
      kind: 'success';
      userId: string;
      amount: number;
      currency: string;
      recipientUsername: string;
      recipientUserId: string;
      senderUsername: string;
    };
    type FailedNotification = {
      kind: 'failed';
      userId: string;
      amount: number;
      currency: string;
      recipientUsername: string;
      reason: string;
    };

    const notificationState: {
      value: SuccessNotification | FailedNotification | null;
    } = { value: null };

    try {
      await this.db.$transaction(async (tx) => {
        const payment = await tx.scheduledPayment.findUnique({
          where: { id: scheduledPaymentId },
          include: {
            recipientUser: {
              select: { username: true },
            },
            user: {
              select: { status: true, username: true },
            },
          },
        });

        if (!payment || payment.status !== 'ACTIVE') {
          return;
        }

        if (payment.user.status !== 'ACTIVE') {
          return;
        }

        if (payment.nextExecutionAt > now) {
          return;
        }

        const scheduledFor = payment.nextExecutionAt;
        const recipientUsername = payment.recipientUser.username;
        const amount = Number(payment.amount);

        const ownerWallet = await tx.wallet.findUnique({
          where: { userId: payment.userId },
          select: { currency: true },
        });
        const currency = ownerWallet?.currency ?? 'IRR';

        let executionId: string | undefined;
        const slotExecutions = await tx.scheduledPaymentExecution.findMany({
          where: { scheduledPaymentId: payment.id },
        });
        const existingForSlot = slotExecutions.find(
          (row) =>
            Math.abs(row.scheduledFor.getTime() - scheduledFor.getTime()) <
            1000,
        );

        if (existingForSlot?.status === 'SUCCESS') {
          return;
        }

        if (existingForSlot) {
          executionId = existingForSlot.id;
        } else {
          try {
            const execution = await tx.scheduledPaymentExecution.create({
              data: {
                scheduledPaymentId: payment.id,
                scheduledFor,
                status: 'FAILED',
              },
            });
            executionId = execution.id;
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              const retryRows = await tx.scheduledPaymentExecution.findMany({
                where: { scheduledPaymentId: payment.id },
              });
              const concurrent = retryRows.find(
                (row) =>
                  Math.abs(
                    row.scheduledFor.getTime() - scheduledFor.getTime(),
                  ) < 1000,
              );
              if (!concurrent || concurrent.status === 'SUCCESS') {
                return;
              }
              executionId = concurrent.id;
            } else {
              throw error;
            }
          }
        }

        if (!executionId) {
          return;
        }

        let failureReason: string | undefined;
        try {
          await this.spendingLimitsService.assertWithinLimitsInTx(
            tx,
            payment.userId,
            'transfer',
            amount,
          );
        } catch (error) {
          if (error instanceof BadRequestException) {
            failureReason = error.message;
          } else {
            throw error;
          }
        }

        if (!failureReason) {
          const transferResult = await this.transactionsService.transferInTx(
            tx,
            payment.userId,
            payment.recipientUserId,
            amount,
            {
              reason: payment.reason ?? undefined,
              category: payment.category ?? undefined,
              scheduledPaymentExecutionId: executionId,
              envelopeId: payment.envelopeId ?? undefined,
            },
          );

          if (transferResult.success) {
            await tx.scheduledPaymentExecution.update({
              where: { id: executionId },
              data: { status: 'SUCCESS', failureReason: null },
            });
            await this.advanceSchedule(tx, payment, scheduledFor);
            notificationState.value = {
              kind: 'success',
              userId: payment.userId,
              amount,
              currency,
              recipientUsername,
              recipientUserId: payment.recipientUserId,
              senderUsername: payment.user.username,
            };
            return;
          }

          failureReason = transferResult.reason;
        }

        await tx.scheduledPaymentExecution.update({
          where: { id: executionId },
          data: {
            status: 'FAILED',
            failureReason,
          },
        });
        if (payment.frequency === 'ONCE') {
          await this.advanceSchedule(tx, payment, scheduledFor, failureReason);
        }
        notificationState.value = {
          kind: 'failed',
          userId: payment.userId,
          amount,
          currency,
          recipientUsername,
          reason: failureReason,
        };
      });

      const notification = notificationState.value;

      if (notification?.kind === 'success') {
        void this.notificationsService.createScheduledPaymentSuccess(
          notification.userId,
          {
            amount: notification.amount,
            currency: notification.currency,
            recipientUsername: notification.recipientUsername,
          },
        );
        void this.notificationsService.createTransferReceived(
          notification.recipientUserId,
          {
            amount: notification.amount,
            currency: notification.currency,
            senderUsername: notification.senderUsername,
          },
        );
        this.auditLogService.log({
          event: 'transfer.completed',
          action: 'complete',
          result: 'success',
          userId: notification.userId,
          resourceType: 'scheduled_payment',
          metadata: {
            amount: notification.amount,
            currency: notification.currency,
          },
        });
      } else if (notification?.kind === 'failed') {
        void this.notificationsService.createScheduledPaymentFailed(
          notification.userId,
          {
            amount: notification.amount,
            currency: notification.currency,
            recipientUsername: notification.recipientUsername,
            reason: notification.reason,
          },
        );
        this.auditLogService.log({
          event: 'transfer.failed',
          action: 'complete',
          result: 'failure',
          userId: notification.userId,
          resourceType: 'scheduled_payment',
          metadata: {
            amount: notification.amount,
            reason: notification.reason,
          },
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  private async advanceSchedule(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      frequency: 'ONCE' | 'WEEKLY' | 'MONTHLY';
      endDate: Date | null;
    },
    scheduledFor: Date,
    failureReason?: string,
  ) {
    if (payment.frequency === 'ONCE') {
      await tx.scheduledPayment.update({
        where: { id: payment.id },
        data: {
          status: failureReason ? 'FAILED' : 'COMPLETED',
        },
      });
      return;
    }

    const nextExecutionAt = computeNextExecutionAt(
      scheduledFor,
      payment.frequency,
    );

    if (!nextExecutionAt) {
      await tx.scheduledPayment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });
      return;
    }

    if (payment.endDate && nextExecutionAt > payment.endDate) {
      await tx.scheduledPayment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });
      return;
    }

    await tx.scheduledPayment.update({
      where: { id: payment.id },
      data: { nextExecutionAt },
    });
  }

  private async updateStatus(
    userId: string,
    id: string,
    requiredStatus: 'ACTIVE' | 'PAUSED',
    nextStatus: 'ACTIVE' | 'PAUSED',
  ) {
    const payment = await this.db.scheduledPayment.findFirst({
      where: { id, userId },
    });

    if (!payment) {
      throw new NotFoundException('Scheduled payment not found');
    }

    if (payment.status !== requiredStatus) {
      throw new BadRequestException(
        'Scheduled payment status cannot be changed',
      );
    }

    return this.db.scheduledPayment.update({
      where: { id },
      data: { status: nextStatus },
      include: this.defaultInclude(),
    });
  }

  private defaultInclude() {
    return {
      recipientUser: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      envelope: {
        select: {
          id: true,
          name: true,
          allocatedAmount: true,
          status: true,
        },
      },
    };
  }
}
