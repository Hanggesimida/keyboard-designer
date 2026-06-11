import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { AdminOrderController } from './orders/admin-order.controller';
import { AdminOrderService } from './orders/admin-order.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminOrderController],
  providers: [AdminOrderService],
})
export class AdminModule {}
