import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEnvelopeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
