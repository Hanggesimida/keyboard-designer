import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
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

  /** 关键词搜索：匹配订单号 */
  @IsString()
  @IsOptional()
  search?: string;
}
