import { Module } from '@nestjs/common';
import { PricingModule } from '@modules/pricing/pricing.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PricingModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
