import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatProvider } from './providers/wechat.provider';
import { OrderModule } from '@modules/order/order.module';
import { NotificationsModule } from '@modules/admin/notifications/notifications.module';

@Module({
  imports: [OrderModule, NotificationsModule],
  controllers: [PaymentController],
  providers: [PaymentService, AlipayProvider, WechatProvider],
})
export class PaymentModule {}
