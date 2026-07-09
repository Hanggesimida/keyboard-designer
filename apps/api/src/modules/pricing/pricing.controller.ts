import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import {
  ORDER_QUANTITY_MAX,
  ORDER_QUANTITY_MIN,
} from '@modules/order/order.constants';
import { PricingService, PriceQuote } from './pricing.service';

class QuoteQuery {
  @IsString()
  designId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ORDER_QUANTITY_MIN)
  @Max(ORDER_QUANTITY_MAX)
  quantity?: number;
}

/**
 * 定价查询接口，供结账页在下单前获取服务端报价用于展示。
 * 与 OrderService 使用同一 PricingService，保证展示价格和实际下单价格一致。
 */
@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /**
   * GET /pricing/quote?designId=xxx&quantity=3
   * 返回定制键帽的报价明细，仅用于前端展示，不产生任何订单记录。
   */
  @Get('quote')
  getQuote(@Query() query: QuoteQuery): PriceQuote {
    return this.pricingService.quote({
      type: 'CUSTOM_KEYCAP',
      designId: query.designId,
      quantity: query.quantity,
    });
  }
}
