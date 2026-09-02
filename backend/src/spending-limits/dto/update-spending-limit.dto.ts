import { IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';
import type { SpendingLimitType } from '../../generated/prisma/client';

export class UpdateSpendingLimitDto {
  @IsEnum([
    'DAILY_TRANSFER',
    'DAILY_WITHDRAWAL',
    'MONTHLY_TRANSFER',
    'MONTHLY_WITHDRAWAL',
  ] as const)
  type: SpendingLimitType;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(5_000_000_000)
  maxAmount: number;
}
