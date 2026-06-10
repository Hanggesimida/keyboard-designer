import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatProvider } from './providers/wechat.provider';
import { OrderModule } from '@modules/order/order.module';

@Module({
  imports: [OrderModule], // 引入 OrderModule 以使用 OrderService
  controllers: [PaymentController],
  providers: [PaymentService, AlipayProvider, WechatProvider],
})
export class PaymentModule {}
