import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { getRequestContext } from '../request-logging/request-context';
import type { AuditLogInput } from './audit-log.types';

const SENSITIVE_KEY =
  /password|token|secret|cookie|authorization|cvv|cvc|pan|card|shaba|accountnumber|iban|pin|otp|refresh/i;

const MAX_METADATA_KEYS = 8;
const MAX_STRING_LENGTH = 120;

function clip(value: string | undefined, max: number) {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function sanitizeMetadata(
  metadata?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(sanitized).length >= MAX_METADATA_KEYS) {
      break;
    }

    if (SENSITIVE_KEY.test(key)) {
      continue;
    }

    if (typeof value === 'string') {
      const clipped = clip(value, MAX_STRING_LENGTH);
      if (clipped) {
        sanitized[key] = clipped;
      }
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly db: DatabaseService) {}

  log(input: AuditLogInput): void {
    const context = getRequestContext();

    void this.db.auditLog
      .create({
        data: {
          event: input.event.slice(0, 80),
          action: input.action.slice(0, 40),
          result: input.result.slice(0, 20),
          userId: input.userId,
          resourceType: clip(input.resourceType, 80),
          resourceId: clip(input.resourceId, 64),
          requestId: clip(input.requestId ?? context.requestId, 64),
          ip: clip(input.ip ?? context.ip, 45),
          userAgent: clip(input.userAgent ?? context.userAgent, 200),
          metadata: sanitizeMetadata(input.metadata),
        },
      })
      .catch(() => {
        this.logger.warn(`Failed to persist audit log (${input.event})`);
      });
  }
}
