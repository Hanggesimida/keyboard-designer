import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from 'generated/prisma/client';

export class QueryOrdersDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
