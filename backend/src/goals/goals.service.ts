import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateGoalDto } from './dto/create-goal.dto';

function parseOptionalDate(
  value: string | undefined,
  fieldName: string,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }

  return date;
}

function goalReason(title: string, action: 'contribute' | 'release') {
  return action === 'contribute'
    ? `Goal contribution: ${title}`
    : `Goal release: ${title}`;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateGoalDto) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Goal title is required');
    }

    const description = dto.description?.trim() || undefined;
    const targetDate = parseOptionalDate(dto.targetDate, 'target date');

    return this.db.goal.create({
      data: {
        userId,
        title,
        description,
        targetAmount: dto.targetAmount,
        targetDate,
        status: 'ACTIVE',
      },
    });
  }

  async listForUser(userId: string) {
    const goals = await this.db.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const totals = await this.db.goal.aggregate({
      where: { userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      _sum: { savedAmount: true },
    });

    return {
      goals,
      summary: {
        totalSavedInGoals: totals._sum.savedAmount ?? 0,
      },
    };
  }

  async getByIdForUser(userId: string, id: string) {
    const goal = await this.db.goal.findFirst({
      where: { id, userId },
      include: {
        contributions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  async contribute(userId: string, goalId: string, amount: number) {
    return this.moveFunds(userId, goalId, amount, 'CONTRIBUTE');
  }

  async release(userId: string, goalId: string, amount: number) {
    return this.moveFunds(userId, goalId, amount, 'RELEASE');
  }

  async cancel(userId: string, goalId: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Goal" WHERE id = ${goalId} AND "userId" = ${userId} FOR UPDATE
      `;

      const goal = await tx.goal.findFirst({
        where: { id: goalId, userId },
      });

      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      if (goal.status !== 'ACTIVE') {
        throw new BadRequestException('Goal cannot be cancelled');
      }

      const savedAmount = Number(goal.savedAmount);
      if (savedAmount > 0) {
        const wallet = await tx.wallet.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!wallet) {
          throw new BadRequestException('Wallet not found');
        }

        const [updatedGoal] = await tx.goal.updateManyAndReturn({
          where: {
            id: goal.id,
            status: 'ACTIVE',
            savedAmount: { gte: savedAmount },
          },
          data: {
            savedAmount: { decrement: savedAmount },
            status: 'CANCELLED',
          },
        });

        if (!updatedGoal) {
          throw new BadRequestException('Goal cannot be cancelled');
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: savedAmount },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: savedAmount,
            type: 'GOAL_RELEASE',
            reason: goalReason(goal.title, 'release'),
            goalId: goal.id,
          },
        });

        await tx.goalContribution.create({
          data: {
            goalId: goal.id,
            amount: savedAmount,
            type: 'RELEASE',
            transactionId: transaction.id,
          },
        });

        return updatedGoal;
      }

      return tx.goal.update({
        where: { id: goalId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  private async moveFunds(
    userId: string,
    goalId: string,
    amount: number,
    direction: 'CONTRIBUTE' | 'RELEASE',
  ) {
    const result = await this.db.$transaction(async (tx) => {
      const goal = await tx.goal.findFirst({
        where: { id: goalId, userId },
      });

      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      if (direction === 'CONTRIBUTE' && goal.status !== 'ACTIVE') {
        throw new BadRequestException('Goal is not active');
      }

      if (
        direction === 'RELEASE' &&
        goal.status !== 'ACTIVE' &&
        goal.status !== 'COMPLETED'
      ) {
        throw new BadRequestException('Goal funds cannot be released');
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true, currency: true },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (direction === 'CONTRIBUTE') {
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
            currency: true,
          },
        });

        if (!updatedWallet) {
          throw new BadRequestException('Insufficient funds');
        }

        const updatedGoal = await tx.goal.update({
          where: { id: goal.id },
          data: {
            savedAmount: { increment: amount },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: 'GOAL_CONTRIBUTE',
            reason: goalReason(goal.title, 'contribute'),
            goalId: goal.id,
          },
        });

        await tx.goalContribution.create({
          data: {
            goalId: goal.id,
            amount,
            type: 'CONTRIBUTE',
            transactionId: transaction.id,
          },
        });

        const savedAmount = Number(updatedGoal.savedAmount);
        const targetAmount = Number(updatedGoal.targetAmount);

        if (savedAmount >= targetAmount) {
          await tx.goal.update({
            where: { id: goal.id },
            data: { status: 'COMPLETED' },
          });
        }

        return {
          goal: await tx.goal.findUniqueOrThrow({ where: { id: goal.id } }),
          balance: updatedWallet.balance,
          currency: updatedWallet.currency,
        };
      }

      const savedAmount = Number(goal.savedAmount);
      if (amount > savedAmount) {
        throw new BadRequestException('Amount exceeds goal saved balance');
      }

      const [updatedGoal] = await tx.goal.updateManyAndReturn({
        where: {
          id: goal.id,
          savedAmount: { gte: amount },
        },
        data: {
          savedAmount: { decrement: amount },
        },
      });

      if (!updatedGoal) {
        throw new BadRequestException('Amount exceeds goal saved balance');
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

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'GOAL_RELEASE',
          reason: goalReason(goal.title, 'release'),
          goalId: goal.id,
        },
      });

      await tx.goalContribution.create({
        data: {
          goalId: goal.id,
          amount,
          type: 'RELEASE',
          transactionId: transaction.id,
        },
      });

      return {
        goal: updatedGoal,
        balance: updatedWallet.balance,
        currency: updatedWallet.currency,
      };
    });

    if (direction === 'CONTRIBUTE') {
      const goal = result.goal;
      const savedAmount = Number(goal.savedAmount);
      const targetAmount = Number(goal.targetAmount);

      void this.notificationsService.createGoalProgress(userId, {
        goalTitle: goal.title,
        amount,
        currency: result.currency,
        savedAmount,
        targetAmount,
      });

      if (savedAmount >= targetAmount) {
        void this.notificationsService.createGoalCompleted(userId, {
          goalTitle: goal.title,
          targetAmount,
          currency: result.currency,
        });
      }
    }

    return result;
  }
}
