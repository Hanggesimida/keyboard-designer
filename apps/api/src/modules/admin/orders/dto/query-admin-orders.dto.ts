import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OrderStatus } from 'generated/prisma/client';

export class QueryAdminOrdersDto {
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
  limit?: number = 20;

  /**
   * 支持单值或多值：?status=PAID 或 ?status=PAID&status=APPROVED
   * class-transformer 会将单个字符串包成数组，class-validator 对每个元素做枚举校验
   */
  @IsEnum(OrderStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  status?: OrderStatus[];

  /** 关键词搜索：匹配订单号或用户邮箱 */
  @IsString()
  @IsOptional()
  search?: string;
}
