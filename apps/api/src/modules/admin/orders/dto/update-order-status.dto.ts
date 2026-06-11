import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from 'generated/prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  /** 管理员备注（可选，用于记录操作原因） */
  @IsString()
  @IsOptional()
  adminNote?: string;
}
