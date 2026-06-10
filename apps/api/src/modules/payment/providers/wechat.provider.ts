import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Order, Payment } from 'generated/prisma/client';
import type {
  IPaymentProvider,
  PaymentResult,
  VerifyResult,
} from './payment-provider.interface';

/**
 * 微信支付 Provider（桩位）
 *
 * TODO: 接入微信支付 SDK 时，在此处实现 createPayment 和 verifyCallback。
 * 参考文档：https://pay.weixin.qq.com/wiki/doc/apiv3/open/pay/chapter2_1.shtml
 *
 * 依赖安装：npm install wechatpay-node-v3
 */
@Injectable()
export class WechatProvider implements IPaymentProvider {
  async createPayment(
    _order: Order,
    _payment: Payment,
  ): Promise<PaymentResult> {
    // TODO: 初始化微信支付客户端，调用 JSAPI 或 Native 下单接口
    throw new ServiceUnavailableException('微信支付渠道尚未接入');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyCallback(_rawBody: any): Promise<VerifyResult> {
    // TODO: 使用平台证书验签，解析 out_trade_no 映射到 orderId
    throw new ServiceUnavailableException('微信支付渠道尚未接入');
  }
}
