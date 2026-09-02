import { IsString, MaxLength } from 'class-validator';

export class UpdateSavedDestinationDto {
  @IsString()
  @MaxLength(120)
  label: string;
}
