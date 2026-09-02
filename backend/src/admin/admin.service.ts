import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  AdminAuditAction,
  Prisma,
  UserAccountStatus,
} from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import type {
  AdminListQueryDto,
  AdminPaymentsQueryDto,
  AdminTransactionsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  statusChangedAt: true,
  statusReason: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboard() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      disabledUsers,
      lockedUsers,
      adminUsers,
      totalWallets,
      depositAgg,
      withdrawalAgg,
      transferAgg,
      pendingPayments,
      failedPayments,
      paidPayments,
      failedScheduled,
      suspiciousEvents,
      totalNotifications,
      unreadNotifications,
      recentTransactions,
      recentSecurityEvents,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { status: 'ACTIVE' } }),
      this.db.user.count({ where: { status: 'DISABLED' } }),
      this.db.user.count({ where: { status: 'LOCKED' } }),
      this.db.user.count({ where: { role: 'ADMIN' } }),
      this.db.wallet.count(),
      this.db.transaction.aggregate({
        where: { type: 'DEPOSIT' },
        _sum: { amount: true },
        _count: true,
      }),
      this.db.transaction.aggregate({
        where: { type: 'WITHDRAWAL' },
        _sum: { amount: true },
        _count: true,
      }),
      this.db.transaction.aggregate({
        where: { type: 'TRANSFER_OUT' },
        _sum: { amount: true },
        _count: true,
      }),
      this.db.payment.count({ where: { status: 'PENDING' } }),
      this.db.payment.count({ where: { status: 'FAILED' } }),
      this.db.payment.count({ where: { status: 'PAID' } }),
      this.db.scheduledPaymentExecution.count({ where: { status: 'FAILED' } }),
      this.db.securityEvent.count({
        where: {
          type: {
            in: [
              'FAILED_LOGIN',
              'FAILED_TRANSFER',
              'FAILED_WITHDRAWAL',
              'LIMIT_EXCEEDED',
              'SUSPICIOUS_ACTIVITY',
            ],
          },
        },
      }),
      this.db.notification.count(),
      this.db.notification.count({ where: { readAt: null } }),
      this.db.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: this.transactionListSelect(),
      }),
      this.db.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: this.securityEventSelect(),
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        disabled: disabledUsers,
        locked: lockedUsers,
        admins: adminUsers,
      },
      wallets: { total: totalWallets },
      transactions: {
        deposits: depositAgg._count,
        withdrawals: withdrawalAgg._count,
        transfers: transferAgg._count,
        depositAmount: Number(depositAgg._sum.amount ?? 0),
        withdrawalAmount: Number(withdrawalAgg._sum.amount ?? 0),
        transferAmount: Number(transferAgg._sum.amount ?? 0),
      },
      operations: {
        pendingPayments,
        failedPayments,
        paidPayments,
        failedScheduledExecutions: failedScheduled,
        suspiciousEvents,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      recentActivity: recentTransactions.map((tx) =>
        this.serializeTransaction(tx),
      ),
      recentSecurityEvents: recentSecurityEvents.map((event) =>
        this.serializeSecurityEvent(event),
      ),
      generatedAt: now.toISOString(),
      activeTodayWindowStart: dayStart.toISOString(),
    };
  }

  async listUsers(query: AdminUsersQueryDto) {
    const { skip, take, page, pageSize } = this.pagination(query);
    const q = query.q?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          ...PUBLIC_USER_SELECT,
          wallet: {
            select: {
              id: true,
              currency: true,
              balance: true,
            },
          },
        },
      }),
    ]);

    return {
      items: users.map((user) => ({
        ...user,
        wallet: user.wallet
          ? {
              id: user.wallet.id,
              currency: user.wallet.currency,
              balance: Number(user.wallet.balance),
            }
          : null,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getUser(adminUserId: string, userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_USER_SELECT,
        wallet: {
          select: {
            id: true,
            currency: true,
            balance: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [transactions, securityEvents, sessions, payments] =
      await Promise.all([
        this.db.transaction.findMany({
          where: { wallet: { userId } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: this.transactionListSelect(),
        }),
        this.db.securityEvent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: this.securityEventSelect(),
        }),
        this.db.userSession.findMany({
          where: { userId, revokedAt: null },
          orderBy: { lastSeenAt: 'desc' },
          take: 10,
          select: {
            id: true,
            deviceLabel: true,
            lastSeenAt: true,
            createdAt: true,
          },
        }),
        this.db.payment.findMany({
          where: { wallet: { userId } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: this.paymentListSelect(),
        }),
      ]);

    await this.recordAudit({
      adminUserId,
      action: 'USER_VIEWED',
      targetType: 'user',
      targetId: userId,
    });

    return {
      ...user,
      wallet: user.wallet
        ? {
            id: user.wallet.id,
            currency: user.wallet.currency,
            balance: Number(user.wallet.balance),
            createdAt: user.wallet.createdAt,
          }
        : null,
      recentTransactions: transactions.map((tx) =>
        this.serializeTransaction(tx),
      ),
      securityEvents: securityEvents.map((event) =>
        this.serializeSecurityEvent(event),
      ),
      sessions,
      recentPayments: payments.map((payment) => this.serializePayment(payment)),
    };
  }

  async setAccountStatus(
    adminUserId: string,
    userId: string,
    status: UserAccountStatus,
    reason?: string,
  ) {
    if (adminUserId === userId) {
      throw new BadRequestException('Cannot change your own account status');
    }

    const target = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === 'ADMIN' && status !== 'ACTIVE') {
      const remainingAdmins = await this.db.user.count({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
          id: { not: userId },
        },
      });
      if (remainingAdmins === 0) {
        throw new BadRequestException('Cannot disable the last admin');
      }
    }

    const action: AdminAuditAction =
      status === 'DISABLED'
        ? 'USER_DISABLED'
        : status === 'LOCKED'
          ? 'USER_LOCKED'
          : target.status === 'LOCKED'
            ? 'USER_UNLOCKED'
            : 'USER_ENABLED';

    const updated = await this.db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          status,
          statusChangedAt: new Date(),
          statusReason: reason?.trim() || null,
        },
        select: PUBLIC_USER_SELECT,
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          action,
          targetType: 'user',
          targetId: userId,
          success: true,
          metadata: reason?.trim() ? { reason: reason.trim() } : undefined,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'ACCOUNT_EVENT',
          category: status === 'ACTIVE' ? 'INFO' : 'WARNING',
          metadata: { status, reason: reason?.trim() || null },
        },
      });

      return user;
    });

    return updated;
  }

  async listTransactions(query: AdminTransactionsQueryDto) {
    const { skip, take, page, pageSize } = this.pagination(query);
    const from = this.parseOptionalDate(query.from, 'from');
    const to = this.parseOptionalDate(query.to, 'to');
    const q = query.q?.trim();

    const where: Prisma.TransactionWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.userId ? { wallet: { userId: query.userId } } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { reason: { contains: q, mode: 'insensitive' } },
              { id: q },
              {
                wallet: {
                  user: {
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

    const [total, items] = await Promise.all([
      this.db.transaction.count({ where }),
      this.db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: this.transactionListSelect(),
      }),
    ]);

    return {
      items: items.map((tx) => this.serializeTransaction(tx)),
      page,
      pageSize,
      total,
    };
  }

  async getTransaction(adminUserId: string, transactionId: string) {
    const transaction = await this.db.transaction.findUnique({
      where: { id: transactionId },
      select: {
        ...this.transactionListSelect(),
        relatedTransactionId: true,
        scheduledPaymentExecutionId: true,
        goalId: true,
        envelopeId: true,
        relatedTransaction: {
          select: { id: true, type: true, amount: true },
        },
        scheduledPaymentExecution: {
          select: {
            id: true,
            status: true,
            failureReason: true,
            scheduledFor: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.recordAudit({
      adminUserId,
      action: 'TRANSACTION_VIEWED',
      targetType: 'transaction',
      targetId: transactionId,
    });

    return {
      ...this.serializeTransaction(transaction),
      relatedTransactionId: transaction.relatedTransactionId,
      scheduledPaymentExecutionId: transaction.scheduledPaymentExecutionId,
      goalId: transaction.goalId,
      envelopeId: transaction.envelopeId,
      relatedTransaction: transaction.relatedTransaction
        ? {
            id: transaction.relatedTransaction.id,
            type: transaction.relatedTransaction.type,
            amount: Number(transaction.relatedTransaction.amount),
          }
        : null,
      scheduledPaymentExecution: transaction.scheduledPaymentExecution,
    };
  }

  async listPayments(query: AdminPaymentsQueryDto) {
    const { skip, take, page, pageSize } = this.pagination(query);
    const q = query.q?.trim();

    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { id: q },
              { refId: { contains: q, mode: 'insensitive' } },
              {
                wallet: {
                  user: {
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

    const [total, items] = await Promise.all([
      this.db.payment.count({ where }),
      this.db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: this.paymentListSelect(),
      }),
    ]);

    return {
      items: items.map((payment) => this.serializePayment(payment)),
      page,
      pageSize,
      total,
    };
  }

  async getPayment(adminUserId: string, paymentId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      select: this.paymentListSelect(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const relatedDeposit = await this.db.transaction.findFirst({
      where: {
        walletId: payment.wallet.id,
        type: 'DEPOSIT',
        amount: payment.amount,
        createdAt: { gte: payment.createdAt },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, type: true, amount: true, createdAt: true },
    });

    await this.recordAudit({
      adminUserId,
      action: 'PAYMENT_VIEWED',
      targetType: 'payment',
      targetId: paymentId,
    });

    return {
      ...this.serializePayment(payment),
      relatedTransaction: relatedDeposit
        ? {
            id: relatedDeposit.id,
            type: relatedDeposit.type,
            amount: Number(relatedDeposit.amount),
            createdAt: relatedDeposit.createdAt,
          }
        : null,
    };
  }

  async listWithdrawals(query: AdminListQueryDto) {
    return this.listTransactions({ ...query, type: 'WITHDRAWAL' });
  }

  async listSecurityEvents(query: AdminListQueryDto) {
    const { skip, take, page, pageSize } = this.pagination(query);
    const q = query.q?.trim();

    const where: Prisma.SecurityEventWhereInput = q
      ? {
          OR: [
            { userId: q },
            {
              user: {
                OR: [
                  { username: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      this.db.securityEvent.count({ where }),
      this.db.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: this.securityEventSelect(),
      }),
    ]);

    return {
      items: items.map((event) => this.serializeSecurityEvent(event)),
      page,
      pageSize,
      total,
    };
  }

  async listAuditLogs(query: AdminListQueryDto) {
    const { skip, take, page, pageSize } = this.pagination(query);

    const [total, items] = await Promise.all([
      this.db.adminAuditLog.count(),
      this.db.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          success: true,
          metadata: true,
          createdAt: true,
          adminUser: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return { items, page, pageSize, total };
  }

  private pagination(query: AdminListQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
  }

  private parseOptionalDate(value: string | undefined, field: string) {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return date;
  }

  private async recordAudit(input: {
    adminUserId: string;
    action: AdminAuditAction;
    targetType: string;
    targetId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.db.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        success: true,
        metadata: input.metadata,
      },
    });
  }

  private transactionListSelect() {
    return {
      id: true,
      amount: true,
      type: true,
      reason: true,
      category: true,
      createdAt: true,
      wallet: {
        select: {
          id: true,
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      },
      counterpartyUser: {
        select: { id: true, username: true },
      },
    } satisfies Prisma.TransactionSelect;
  }

  private paymentListSelect() {
    return {
      id: true,
      amount: true,
      status: true,
      refId: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: {
          id: true,
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      },
    } satisfies Prisma.PaymentSelect;
  }

  private securityEventSelect() {
    return {
      id: true,
      type: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, email: true },
      },
    } satisfies Prisma.SecurityEventSelect;
  }

  private serializeTransaction(tx: {
    id: string;
    amount: { toString(): string } | number;
    type: string;
    reason: string | null;
    category: string | null;
    createdAt: Date;
    wallet: {
      id: string;
      user: { id: string; username: string; email: string };
    };
    counterpartyUser: { id: string; username: string } | null;
  }) {
    return {
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      reason: tx.reason,
      category: tx.category,
      createdAt: tx.createdAt,
      walletId: tx.wallet.id,
      user: tx.wallet.user,
      counterparty: tx.counterpartyUser,
    };
  }

  private serializePayment(payment: {
    id: string;
    amount: { toString(): string } | number;
    status: string;
    refId: string | null;
    createdAt: Date;
    updatedAt: Date;
    wallet: {
      id: string;
      user: { id: string; username: string; email: string };
    };
  }) {
    return {
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status,
      refId: payment.refId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      walletId: payment.wallet.id,
      user: payment.wallet.user,
    };
  }

  private serializeSecurityEvent(event: {
    id: string;
    type: string;
    createdAt: Date;
    user: { id: string; username: string; email: string };
  }) {
    return {
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      user: event.user,
    };
  }
}
