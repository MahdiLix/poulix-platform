import { BadRequestException, Injectable } from '@nestjs/common';
import type { SecurityEventType, Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  deviceKeyFromUserAgent,
  deviceLabelFromUserAgent,
} from '../common/financial-crypto';

const FAILED_OPERATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_FAILED_OPERATIONS_PER_HOUR = 15;

@Injectable()
export class SecurityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async recordSuccessfulLogin(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
    options?: { emitNewDeviceEvent?: boolean },
  ) {
    const ua = userAgent?.trim() || 'unknown';
    const deviceKey = deviceKeyFromUserAgent(ua);
    const existing = await this.db.userSession.findUnique({
      where: {
        userId_deviceKey: {
          userId,
          deviceKey,
        },
      },
    });

    const emitNewDeviceEvent = options?.emitNewDeviceEvent !== false;

    if (!existing && emitNewDeviceEvent) {
      await this.recordEvent(
        userId,
        'NEW_DEVICE_LOGIN',
        {
          deviceLabel: deviceLabelFromUserAgent(ua),
        },
        ipAddress,
      );

      void this.notificationsService.createNotification(userId, {
        type: 'SECURITY_WARNING',
        category: 'WARNING',
        metadata: {
          reason: 'NEW_DEVICE_LOGIN',
          deviceLabel: deviceLabelFromUserAgent(ua),
        },
      });
    } else if (existing?.revokedAt) {
      await this.db.userSession.delete({ where: { id: existing.id } });
    }

    const session = await this.db.userSession.upsert({
      where: {
        userId_deviceKey: {
          userId,
          deviceKey,
        },
      },
      create: {
        userId,
        deviceKey,
        deviceLabel: deviceLabelFromUserAgent(ua),
        userAgent: ua.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 45),
      },
      update: {
        lastSeenAt: new Date(),
        deviceLabel: deviceLabelFromUserAgent(ua),
        userAgent: ua.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 45),
      },
    });

    return session.id;
  }

  async recordFailedLogin(userId: string, ipAddress?: string) {
    await this.recordEvent(userId, 'FAILED_LOGIN', undefined, ipAddress);
  }

  async recordFailedTransfer(
    userId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.recordEvent(userId, 'FAILED_TRANSFER', metadata);
    await this.assertNotAbusive(userId);
  }

  async assertOperationAllowed(userId: string) {
    const since = new Date(Date.now() - FAILED_OPERATION_WINDOW_MS);
    const count = await this.db.securityEvent.count({
      where: {
        userId,
        type: { in: ['FAILED_TRANSFER', 'FAILED_WITHDRAWAL'] },
        createdAt: { gte: since },
      },
    });

    if (count >= MAX_FAILED_OPERATIONS_PER_HOUR) {
      throw new BadRequestException('Too many failed financial attempts');
    }
  }

  async recordFailedWithdrawal(
    userId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.recordEvent(userId, 'FAILED_WITHDRAWAL', metadata);
    await this.assertNotAbusive(userId);
  }

  async recordLimitExceeded(
    userId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.recordEvent(userId, 'LIMIT_EXCEEDED', metadata);
  }

  async listSessions(userId: string) {
    const sessions = await this.db.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceLabel: session.deviceLabel,
      ipAddress: session.ipAddress,
      lastSeenAt: session.lastSeenAt,
      createdAt: session.createdAt,
      isCurrent: false,
    }));
  }

  async listEvents(userId: string, limit = 30) {
    const events = await this.db.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      type: event.type,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      createdAt: event.createdAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.db.userSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session) {
      return { success: false };
    }

    await this.db.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.recordEvent(userId, 'SESSION_REVOKED', {
      sessionId,
    });

    return { success: true };
  }

  private async recordEvent(
    userId: string,
    type: SecurityEventType,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    await this.db.securityEvent.create({
      data: {
        userId,
        type,
        metadata:
          metadata === undefined
            ? undefined
            : (metadata as Prisma.InputJsonValue),
        ipAddress: ipAddress?.slice(0, 45),
      },
    });
  }

  private async assertNotAbusive(userId: string) {
    const since = new Date(Date.now() - FAILED_OPERATION_WINDOW_MS);
    const count = await this.db.securityEvent.count({
      where: {
        userId,
        type: { in: ['FAILED_TRANSFER', 'FAILED_WITHDRAWAL'] },
        createdAt: { gte: since },
      },
    });

    if (count >= MAX_FAILED_OPERATIONS_PER_HOUR) {
      await this.recordEvent(userId, 'SUSPICIOUS_ACTIVITY', {
        failedOperations: count,
      });

      void this.notificationsService.createNotification(userId, {
        type: 'SECURITY_WARNING',
        category: 'WARNING',
        metadata: {
          reason: 'SUSPICIOUS_ACTIVITY',
          failedOperations: count,
        },
      });
    }
  }
}
