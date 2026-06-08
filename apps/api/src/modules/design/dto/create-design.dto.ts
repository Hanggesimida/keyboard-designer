import { IsString, MaxLength, IsObject, IsUrl, IsOptional, MinLength } from 'class-validator';
import type { Prisma } from '@prisma/client';

export class CreateDesignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsObject()
  data: Prisma.InputJsonValue;

  @IsUrl()
  @IsOptional()
  previewUrl?: string;
}
