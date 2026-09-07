import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  TransactionCategory,
  TransactionType,
} from '../../generated/prisma/client';

export class TransactionsQueryDto {
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
  @IsEnum([
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'GOAL_CONTRIBUTE',
    'GOAL_RELEASE',
    'ENVELOPE_ALLOCATE',
    'ENVELOPE_RELEASE',
    'GOALS',
    'ENVELOPES',
  ] as const)
  type?: TransactionType | 'GOALS' | 'ENVELOPES';

  @IsOptional()
  @IsEnum([
    'DINNER',
    'LUNCH',
    'RENT',
    'SHOPPING',
    'GIFT',
    'TRANSPORTATION',
    'FAMILY_SUPPORT',
    'OTHER',
  ] as const)
  category?: TransactionCategory;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}
