import { IsEnum, IsOptional } from 'class-validator';
import { DesignStatus } from 'generated/prisma/client';

export class QueryDesignsDto {
  @IsEnum(DesignStatus)
  @IsOptional()
  status?: DesignStatus;
}
