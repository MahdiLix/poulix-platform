import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TransactionCategoryDto } from '../../wallets/dto/withdraw.dto';

export enum ScheduledPaymentFrequencyDto {
  ONCE = 'ONCE',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateScheduledPaymentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  recipient: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount: number;

  @IsEnum(ScheduledPaymentFrequencyDto)
  frequency: ScheduledPaymentFrequencyDto;

  @IsDateString()
  startDate: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsEnum(TransactionCategoryDto)
  category?: TransactionCategoryDto;
}
