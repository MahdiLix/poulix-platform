import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  targetAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
