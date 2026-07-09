import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSubAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  displayName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
