import { IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from 'generated/prisma/client';

export class InitiatePaymentDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentMethod, { message: 'method 必须为 ALIPAY 或 WECHAT' })
  method: PaymentMethod;
}
