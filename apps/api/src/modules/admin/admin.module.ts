import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { AdminOrderController } from './orders/admin-order.controller';
import { AdminOrderService } from './orders/admin-order.service';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PaymentModule],
  controllers: [AdminOrderController],
  providers: [AdminOrderService],
})
export class AdminModule {}
