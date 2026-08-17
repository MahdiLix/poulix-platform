import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class DepositDto {
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount: number;
}
