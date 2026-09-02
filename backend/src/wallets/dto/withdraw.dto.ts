import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export enum TransactionCategoryDto {
  DINNER = 'DINNER',
  LUNCH = 'LUNCH',
  RENT = 'RENT',
  SHOPPING = 'SHOPPING',
  GIFT = 'GIFT',
  TRANSPORTATION = 'TRANSPORTATION',
  FAMILY_SUPPORT = 'FAMILY_SUPPORT',
  OTHER = 'OTHER',
}

export class WithdrawDto {
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{10,18}$/)
  accountNumber?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^IR\d{24}$/)
  shabaNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsEnum(TransactionCategoryDto)
  category?: TransactionCategoryDto;
}
