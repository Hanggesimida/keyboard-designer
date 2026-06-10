import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Order, Payment } from 'generated/prisma/client';
import type {
  IPaymentProvider,
  PaymentResult,
  VerifyResult,
} from './payment-provider.interface';

/**
 * 支付宝支付 Provider（桩位）
 *
 * TODO: 接入支付宝 SDK 时，在此处实现 createPayment 和 verifyCallback。
 * 参考文档：https://opendocs.alipay.com/open/270/105899
 *
 * 依赖安装：npm install alipay-sdk
 */
@Injectable()
export class AlipayProvider implements IPaymentProvider {
  async createPayment(
    _order: Order,
    _payment: Payment,
  ): Promise<PaymentResult> {
    // TODO: 初始化 AlipaySDK，调用 alipay.trade.page.pay 或 alipay.trade.app.pay
    throw new ServiceUnavailableException('支付宝支付渠道尚未接入');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyCallback(_rawBody: any): Promise<VerifyResult> {
    // TODO: 使用支付宝公钥验签，解析 out_trade_no 映射到 orderId
    throw new ServiceUnavailableException('支付宝支付渠道尚未接入');
  }
}
