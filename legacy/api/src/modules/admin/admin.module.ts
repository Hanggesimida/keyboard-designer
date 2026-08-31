import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { AdminOrderController } from './orders/admin-order.controller';
import { AdminOrderService } from './orders/admin-order.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PaymentModule],
  controllers: [AdminOrderController, AdminUsersController],
  providers: [AdminOrderService, AdminUsersService],
})
export class AdminModule {}
