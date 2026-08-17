import {
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

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
}
