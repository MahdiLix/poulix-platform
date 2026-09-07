import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { SecurityEventType } from '../../generated/prisma/client';

export class SecurityEventsQueryDto {
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
  pageSize?: number = 30;

  @IsOptional()
  @IsEnum([
    'NEW_DEVICE_LOGIN',
    'FAILED_LOGIN',
    'FAILED_TRANSFER',
    'FAILED_WITHDRAWAL',
    'LIMIT_EXCEEDED',
    'SUSPICIOUS_ACTIVITY',
    'SESSION_REVOKED',
  ] as const)
  type?: SecurityEventType;
}
