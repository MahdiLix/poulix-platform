import { BadRequestException, Injectable } from '@nestjs/common';
import type { SecurityEventType, Prisma } from '../generated/prisma/client';
import { AuditLogService } from '../audit-logging/audit-log.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  deviceEnvironmentFromUserAgent,
  deviceKeyFromUserAgent,
  deviceLabelFromUserAgent,
} from '../common/financial-crypto';
import type { SecurityEventsQueryDto } from './dto/security-events-query.dto';

const FAILED_OPERATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_FAILED_OPERATIONS_PER_HOUR = 15;

@Injectable()
export class SecurityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async recordSuccessfulLogin(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
    options?: { emitNewDeviceEvent?: boolean },
  ) {
    const ua = userAgent?.trim() || 'unknown';
    const deviceKey = deviceKeyFromUserAgent(ua);
    const existing = await this.db.userSession.findFirst({
      where: { userId, deviceKey },
      select: { id: true },
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
        type: 'ACCOUNT_EVENT',
        category: 'INFO',
        metadata: {
          reason: 'NEW_DEVICE_LOGIN',
          deviceLabel: deviceLabelFromUserAgent(ua),
        },
      });
    }

    const session = await this.db.userSession.create({
      data: {
        userId,
        deviceKey,
        deviceLabel: deviceLabelFromUserAgent(ua),
        userAgent: ua.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 45),
      },
    });

    return session.id;
  }

  async recordFailedLogin(userId: string, ipAddress?: string) {
    await this.recordEvent(userId, 'FAILED_LOGIN', undefined, ipAddress);
    void this.notificationsService.createNotification(userId, {
      type: 'SECURITY_WARNING',
      category: 'WARNING',
      metadata: {
        reason: 'FAILED_LOGIN',
      },
    });
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

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.db.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });

    const groups = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const grouped = groups.get(session.deviceKey) ?? [];
      grouped.push(session);
      groups.set(session.deviceKey, grouped);
    }

    return [...groups.values()].map((grouped) => {
      const current = grouped.find(
        (session) => session.id === currentSessionId,
      );
      const representative = current ?? grouped[0];
      const environment = deviceEnvironmentFromUserAgent(
        representative.userAgent ?? '',
      );

      return {
        id: representative.id,
        sessionIds: grouped.map((session) => session.id),
        sessionCount: grouped.length,
        deviceKey: representative.deviceKey,
        deviceLabel: representative.deviceLabel,
        environment,
        ipAddress: representative.ipAddress,
        lastSeenAt: grouped[0].lastSeenAt,
        createdAt: grouped[grouped.length - 1].createdAt,
        isCurrent: current !== undefined,
      };
    });
  }

  async listEvents(userId: string, query: SecurityEventsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const where = { userId, ...(query.type ? { type: query.type } : {}) };
    const [events, total] = await this.db.$transaction([
      this.db.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.securityEvent.count({ where }),
    ]);

    return {
      items: events.map((event) => ({
        id: event.id,
        type: event.type,
        metadata: event.metadata,
        ipAddress: event.ipAddress,
        createdAt: event.createdAt,
      })),
      page,
      pageSize,
      total,
    };
  }

  async touchSession(userId: string, sessionId?: string) {
    if (!sessionId) {
      return { success: false };
    }

    const result = await this.db.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });

    return { success: result.count === 1 };
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

  async revokeSessionEnvironment(userId: string, sessionId: string) {
    const session = await this.db.userSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session) {
      return { success: false };
    }

    await this.db.userSession.updateMany({
      where: {
        userId,
        deviceKey: session.deviceKey,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await this.recordEvent(userId, 'SESSION_REVOKED', {
      sessionId,
      deviceKey: session.deviceKey,
    });

    this.auditLogService.log({
      event: 'auth.session_revoked',
      action: 'revoke',
      result: 'success',
      userId,
      resourceType: 'session',
      resourceId: sessionId,
      metadata: { scope: 'device' },
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
