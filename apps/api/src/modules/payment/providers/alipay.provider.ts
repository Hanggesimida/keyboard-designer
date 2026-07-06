import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlipaySdk } from 'alipay-sdk';
import type { Order, Payment } from 'generated/prisma/client';
import { getAlipayConfig, isAlipayEnabled } from '../config/alipay.config';
import type {
  IPaymentProvider,
  PaymentResult,
  VerifyResult,
  RefundOptions,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class AlipayProvider implements IPaymentProvider {
  private sdk: AlipaySdk | null = null;

  constructor(private readonly config: ConfigService) {}

  private getSdk(): AlipaySdk {
    if (!isAlipayEnabled(this.config)) {
      throw new ServiceUnavailableException('支付宝未配置');
    }

    if (!this.sdk) {
      const alipayConfig = getAlipayConfig(this.config);
      this.sdk = new AlipaySdk({
        appId: alipayConfig.appId,
        privateKey: alipayConfig.appPrivateKey,
        alipayPublicKey: alipayConfig.officialPublicKey,
        gateway: alipayConfig.gateway,
      });
    }

    return this.sdk;
  }

  async createPayment(order: Order, payment: Payment): Promise<PaymentResult> {
    const alipayConfig = getAlipayConfig(this.config);
    const sdk = this.getSdk();

    try {
      const formHtml = await sdk.pageExecute('alipay.trade.page.pay', {
        returnUrl: alipayConfig.returnUrl
          ? `${alipayConfig.returnUrl}/${order.id}?from=alipay`
          : undefined,
        notifyUrl: alipayConfig.notifyUrl,
        bizContent: {
          out_trade_no: payment.id,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: payment.amount.toString(),
          subject: `烬炆定制键帽 ${order.orderNo}`,
          body: `订单号：${order.orderNo}`,
        },
      });

      return { payData: { formHtml } };
    } catch (err) {
      throw new ServiceUnavailableException(
        `支付宝支付发起失败：${(err as Error).message}`,
      );
    }
  }

  async verifyCallback(
    rawBody: Record<string, string>,
  ): Promise<VerifyResult> {
    const sdk = this.getSdk();
    const isValid = sdk.checkNotifySign(rawBody);

    if (!isValid) {
      throw new BadRequestException('支付宝回调验签失败');
    }

    const paymentId = rawBody.out_trade_no ?? '';
    const tradeStatus = rawBody.trade_status;

    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return { success: false, paymentId };
    }

    return { success: true, paymentId };
  }

  async refund(payment: Payment, options: RefundOptions): Promise<RefundResult> {
    const sdk = this.getSdk();

    try {
      const result = (await sdk.exec('alipay.trade.refund', {
        bizContent: {
          ...(payment.thirdPartyId
            ? { trade_no: payment.thirdPartyId }
            : { out_trade_no: payment.id }),
          refund_amount: options.amount,
          out_request_no: options.outRequestNo,
          ...(options.reason ? { refund_reason: options.reason } : {}),
        },
      })) as Record<string, unknown>;

      const fundChange = result.fund_change;
      const success = fundChange === 'Y' || fundChange === 'y';

      return { success, rawResponse: result };
    } catch (err) {
      throw new ServiceUnavailableException(
        `支付宝退款失败：${(err as Error).message}`,
      );
    }
  }
}
