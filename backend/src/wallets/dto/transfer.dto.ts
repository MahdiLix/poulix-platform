import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TransactionCategoryDto } from './withdraw.dto';

export class TransferDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  recipient: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsEnum(TransactionCategoryDto)
  category?: TransactionCategoryDto;

  @IsOptional()
  @IsUUID()
  envelopeId?: string;
}
