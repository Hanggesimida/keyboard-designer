import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PricingService, PriceQuote } from './pricing.service';

class QuoteQuery {
  @IsString()
  designId: string;
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
   * GET /pricing/quote?designId=xxx
   * 返回定制键帽的报价明细，仅用于前端展示，不产生任何订单记录。
   */
  @Get('quote')
  getQuote(@Query() query: QuoteQuery): PriceQuote {
    return this.pricingService.quote({
      type: 'CUSTOM_KEYCAP',
      designId: query.designId,
    });
  }
}
