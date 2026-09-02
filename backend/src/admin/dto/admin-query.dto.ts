import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  PaymentStatus,
  TransactionType,
  UserAccountStatus,
} from '../../generated/prisma/client';

export class AdminListQueryDto {
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
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(['ACTIVE', 'DISABLED', 'LOCKED'] as const)
  status?: UserAccountStatus;
}

export class AdminTransactionsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum([
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'GOAL_CONTRIBUTE',
    'GOAL_RELEASE',
    'ENVELOPE_ALLOCATE',
    'ENVELOPE_RELEASE',
  ] as const)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class AdminPaymentsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'FAILED', 'CANCELLED'] as const)
  status?: PaymentStatus;
}

export class AdminAccountActionDto {
  @IsBoolean()
  @Equals(true, { message: 'Confirmation required' })
  confirm!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
