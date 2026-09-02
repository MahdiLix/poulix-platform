import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  NotificationCategory,
  NotificationType,
  Prisma,
} from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

export type NotificationMetadata = Record<string, unknown>;

export type CreateNotificationInput = {
  type: NotificationType;
  category: NotificationCategory;
  metadata?: NotificationMetadata;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async createNotification(userId: string, input: CreateNotificationInput) {
    return this.db.notification.create({
      data: {
        userId,
        type: input.type,
        category: input.category,
        metadata:
          input.metadata === undefined
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }

  async createDepositSuccess(
    userId: string,
    metadata: { amount: number; currency: string; refId?: string | null },
  ) {
    return this.createNotification(userId, {
      type: 'DEPOSIT_SUCCESS',
      category: 'SUCCESS',
      metadata,
    });
  }

  async createWithdrawalSuccess(
    userId: string,
    metadata: { amount: number; currency: string },
  ) {
    return this.createNotification(userId, {
      type: 'WITHDRAWAL_SUCCESS',
      category: 'SUCCESS',
      metadata,
    });
  }

  async createTransferSuccess(
    userId: string,
    metadata: {
      amount: number;
      currency: string;
      recipientUsername: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'TRANSFER_SUCCESS',
      category: 'SUCCESS',
      metadata,
    });
  }

  async createTransferReceived(
    userId: string,
    metadata: {
      amount: number;
      currency: string;
      senderUsername: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'TRANSFER_RECEIVED',
      category: 'SUCCESS',
      metadata,
    });
  }

  async createTransferFailed(
    userId: string,
    metadata: {
      amount: number;
      currency: string;
      recipientUsername?: string;
      reason?: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'TRANSFER_FAILED',
      category: 'ERROR',
      metadata,
    });
  }

  async createScheduledPaymentSuccess(
    userId: string,
    metadata: {
      amount: number;
      currency: string;
      recipientUsername: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'SCHEDULED_PAYMENT_SUCCESS',
      category: 'SUCCESS',
      metadata,
    });
  }

  async createScheduledPaymentFailed(
    userId: string,
    metadata: {
      amount: number;
      currency: string;
      recipientUsername: string;
      reason?: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'SCHEDULED_PAYMENT_FAILED',
      category: 'ERROR',
      metadata,
    });
  }

  async createGoalProgress(
    userId: string,
    metadata: {
      goalTitle: string;
      amount: number;
      currency: string;
      savedAmount: number;
      targetAmount: number;
    },
  ) {
    return this.createNotification(userId, {
      type: 'GOAL_PROGRESS',
      category: 'INFO',
      metadata,
    });
  }

  async createGoalCompleted(
    userId: string,
    metadata: {
      goalTitle: string;
      targetAmount: number;
      currency: string;
    },
  ) {
    return this.createNotification(userId, {
      type: 'GOAL_COMPLETED',
      category: 'SUCCESS',
      metadata,
    });
  }

  async listForUser(userId: string, limit = 50) {
    const notifications = await this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map((n) => this.serialize(n));
  }

  async getUnreadCount(userId: string) {
    return this.db.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const existing = await this.db.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.readAt) {
      return this.serialize(existing);
    }

    const updated = await this.db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.serialize(updated);
  }

  async markAllAsRead(userId: string) {
    await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true };
  }

  private serialize(notification: {
    id: string;
    type: NotificationType;
    category: NotificationCategory;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      metadata: notification.metadata,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      isRead: notification.readAt !== null,
    };
  }
}
