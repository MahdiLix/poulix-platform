import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  Prisma,
  SpendingLimitType,
  TransactionType,
} from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { UpdateSpendingLimitDto } from './dto/update-spending-limit.dto';

export const DEFAULT_SPENDING_LIMITS: Record<SpendingLimitType, number> = {
  DAILY_TRANSFER: 500_000_000,
  DAILY_WITHDRAWAL: 100_000_000,
  MONTHLY_TRANSFER: 5_000_000_000,
  MONTHLY_WITHDRAWAL: 2_000_000_000,
};

const LIMIT_TRANSACTION_TYPES: Record<SpendingLimitType, TransactionType[]> = {
  DAILY_TRANSFER: ['TRANSFER_OUT'],
  MONTHLY_TRANSFER: ['TRANSFER_OUT'],
  DAILY_WITHDRAWAL: ['WITHDRAWAL'],
  MONTHLY_WITHDRAWAL: ['WITHDRAWAL'],
};

@Injectable()
export class SpendingLimitsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getLimitsWithUsage(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: { id: true, currency: true },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const overrides = await this.db.userSpendingLimit.findMany({
      where: { userId },
    });

    const overrideMap = new Map(
      overrides.map((limit) => [limit.type, Number(limit.maxAmount)]),
    );

    const now = new Date();
    const dayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    const usageByType = await this.computeUsage(
      wallet.id,
      dayStart,
      monthStart,
    );

    const types = Object.keys(DEFAULT_SPENDING_LIMITS) as SpendingLimitType[];

    return types.map((type) => {
      const maxAmount = overrideMap.get(type) ?? DEFAULT_SPENDING_LIMITS[type];
      const usedAmount = usageByType[type] ?? 0;
      const remainingAmount = Math.max(0, maxAmount - usedAmount);
      const periodStart = type.startsWith('DAILY') ? dayStart : monthStart;

      return {
        type,
        maxAmount,
        usedAmount,
        remainingAmount,
        periodStart,
        currency: wallet.currency,
      };
    });
  }

  async updateLimit(userId: string, dto: UpdateSpendingLimitDto) {
    const limit = await this.db.userSpendingLimit.upsert({
      where: {
        userId_type: {
          userId,
          type: dto.type,
        },
      },
      create: {
        userId,
        type: dto.type,
        maxAmount: dto.maxAmount,
      },
      update: {
        maxAmount: dto.maxAmount,
      },
    });

    return {
      type: limit.type,
      maxAmount: Number(limit.maxAmount),
    };
  }

  async assertWithinLimitsInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    operation: 'transfer' | 'withdrawal',
    amount: number,
  ) {
    const wallet = await tx.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;

    const types: SpendingLimitType[] =
      operation === 'transfer'
        ? ['DAILY_TRANSFER', 'MONTHLY_TRANSFER']
        : ['DAILY_WITHDRAWAL', 'MONTHLY_WITHDRAWAL'];

    const overrides = await tx.userSpendingLimit.findMany({
      where: { userId, type: { in: types } },
    });

    const overrideMap = new Map(
      overrides.map((limit) => [limit.type, Number(limit.maxAmount)]),
    );

    const now = new Date();
    const dayStart = startOfDay(now);
    const monthStart = startOfMonth(now);

    for (const type of types) {
      const maxAmount = overrideMap.get(type) ?? DEFAULT_SPENDING_LIMITS[type];
      const periodStart = type.startsWith('DAILY') ? dayStart : monthStart;
      const used = await this.sumUsageInTx(tx, wallet.id, type, periodStart);

      if (used + amount > maxAmount) {
        void this.notificationsService.createNotification(userId, {
          type: 'SPENDING_LIMIT_WARNING',
          category: 'WARNING',
          metadata: { limitType: type, maxAmount, usedAmount: used, amount },
        });

        throw new BadRequestException('Spending limit exceeded');
      }
    }
  }

  private async computeUsage(
    walletId: string,
    dayStart: Date,
    monthStart: Date,
  ) {
    const dayAgg = await this.db.transaction.groupBy({
      by: ['type'],
      where: {
        walletId,
        createdAt: { gte: dayStart },
        type: { in: ['TRANSFER_OUT', 'WITHDRAWAL'] },
      },
      _sum: { amount: true },
    });

    const monthAgg = await this.db.transaction.groupBy({
      by: ['type'],
      where: {
        walletId,
        createdAt: { gte: monthStart },
        type: { in: ['TRANSFER_OUT', 'WITHDRAWAL'] },
      },
      _sum: { amount: true },
    });

    const dayTransfer = sumType(dayAgg, 'TRANSFER_OUT');
    const dayWithdrawal = sumType(dayAgg, 'WITHDRAWAL');
    const monthTransfer = sumType(monthAgg, 'TRANSFER_OUT');
    const monthWithdrawal = sumType(monthAgg, 'WITHDRAWAL');

    return {
      DAILY_TRANSFER: dayTransfer,
      DAILY_WITHDRAWAL: dayWithdrawal,
      MONTHLY_TRANSFER: monthTransfer,
      MONTHLY_WITHDRAWAL: monthWithdrawal,
    } as Record<SpendingLimitType, number>;
  }

  private async sumUsageInTx(
    tx: Prisma.TransactionClient,
    walletId: string,
    type: SpendingLimitType,
    periodStart: Date,
  ) {
    const result = await tx.transaction.aggregate({
      where: {
        walletId,
        createdAt: { gte: periodStart },
        type: { in: LIMIT_TRANSACTION_TYPES[type] },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }
}

function sumType(
  rows: Array<{ type: TransactionType; _sum: { amount: unknown } }>,
  type: TransactionType,
) {
  const row = rows.find((entry) => entry.type === type);
  return Number(row?._sum.amount ?? 0);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
