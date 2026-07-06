import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MockCallbackDto } from './dto/mock-callback.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { DevOnlyGuard } from '../../common/guards/dev-only.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(
    @CurrentUser() user: { id: string },
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiate(user.id, dto);
  }

  /**
   * 伪支付回调（开发/测试专用）。
   * 生产环境部署时，可通过环境变量或 Guard 限制此接口仅在非生产环境可用。
   */
  @UseGuards(JwtAuthGuard, DevOnlyGuard)
  @Post('mock-callback')
  @HttpCode(HttpStatus.OK)
  mockCallback(@Body() dto: MockCallbackDto) {
    return this.paymentService.mockCallback(dto);
  }

  /**
   * 支付宝异步通知（预留桩位）。
   * 注意：第三方回调不携带 JWT，不加 JwtAuthGuard。
   */
  @Post('alipay/notify')
  @HttpCode(HttpStatus.OK)
  alipayNotify(@Req() req: any) {
    return this.paymentService.handleAlipayNotify(req.body);
  }

  /**
   * 微信支付通知（预留桩位）。
   * 注意：第三方回调不携带 JWT，不加 JwtAuthGuard。
   */
  @Post('wechat/notify')
  @HttpCode(HttpStatus.OK)
  wechatNotify(@Req() req: any) {
    return this.paymentService.handleWechatNotify(req.body);
  }
}
