import { IsString, MaxLength, MinLength } from 'class-validator';

export class LookupUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier: string;
}
