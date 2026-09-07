import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import type {
  NotificationCategory,
  NotificationType,
} from '../../generated/prisma/client';

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @IsOptional()
  @IsEnum([
    'DEPOSIT_SUCCESS',
    'WITHDRAWAL_SUCCESS',
    'TRANSFER_SUCCESS',
    'TRANSFER_RECEIVED',
    'TRANSFER_FAILED',
    'SCHEDULED_PAYMENT_SUCCESS',
    'SCHEDULED_PAYMENT_FAILED',
    'GOAL_PROGRESS',
    'GOAL_COMPLETED',
    'ACCOUNT_EVENT',
    'SECURITY_WARNING',
    'SPENDING_LIMIT_WARNING',
  ] as const)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(['SUCCESS', 'WARNING', 'ERROR', 'INFO'] as const)
  category?: NotificationCategory;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : undefined;
  })
  @IsBoolean()
  isRead?: boolean;
}
