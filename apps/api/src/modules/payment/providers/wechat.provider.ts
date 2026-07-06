import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Order, Payment } from 'generated/prisma/client';
import type {
  IPaymentProvider,
  PaymentResult,
  VerifyResult,
  RefundOptions,
  RefundResult,
} from './payment-provider.interface';

/**
 * 微信支付 Provider（桩位）
 */
@Injectable()
export class WechatProvider implements IPaymentProvider {
  async createPayment(
    _order: Order,
    _payment: Payment,
  ): Promise<PaymentResult> {
    throw new ServiceUnavailableException('微信支付渠道尚未接入');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyCallback(_rawBody: any): Promise<VerifyResult> {
    throw new ServiceUnavailableException('微信支付渠道尚未接入');
  }

  async refund(_payment: Payment, _options: RefundOptions): Promise<RefundResult> {
    throw new ServiceUnavailableException('微信支付渠道尚未接入');
  }
}
