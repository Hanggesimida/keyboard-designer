import { Module } from '@nestjs/common';
import { PricingModule } from '@modules/pricing/pricing.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { NotificationsModule } from '@modules/admin/notifications/notifications.module';

@Module({
  imports: [PricingModule, NotificationsModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
