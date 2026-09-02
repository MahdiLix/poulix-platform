import {
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { FinancialDestinationType } from '../../generated/prisma/client';

export class CreateSavedDestinationDto {
  @IsString()
  @MaxLength(120)
  label: string;

  @IsEnum(['P2P_USER', 'BANK_ACCOUNT', 'SHABA', 'CARD'] as const)
  type: FinancialDestinationType;

  @ValidateIf((dto: CreateSavedDestinationDto) => dto.type === 'P2P_USER')
  @IsString()
  @MaxLength(120)
  recipient?: string;

  @ValidateIf((dto: CreateSavedDestinationDto) => dto.type === 'BANK_ACCOUNT')
  @IsString()
  @Matches(/^\d{10,18}$/)
  accountNumber?: string;

  @ValidateIf((dto: CreateSavedDestinationDto) => dto.type === 'SHABA')
  @IsString()
  @Matches(/^IR\d{24}$/)
  shabaNumber?: string;

  @ValidateIf((dto: CreateSavedDestinationDto) => dto.type === 'CARD')
  @IsString()
  @Matches(/^\d{16,19}$/)
  cardNumber?: string;
}
