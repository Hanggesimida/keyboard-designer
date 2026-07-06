import {
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AlipayProvider.name);
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

    const bizContent = {
      ...(payment.thirdPartyId
        ? { trade_no: payment.thirdPartyId }
        : { out_trade_no: payment.id }),
      refund_amount: options.amount,
      out_request_no: options.outRequestNo,
      ...(options.reason ? { refund_reason: options.reason } : {}),
    };

    this.logger.log(
      `调用 alipay.trade.refund paymentId=${payment.id} tradeNo=${payment.thirdPartyId ?? '(无)'} amount=${options.amount} outRequestNo=${options.outRequestNo}`,
    );

    try {
      const result = (await sdk.exec('alipay.trade.refund', {
        bizContent,
      })) as Record<string, unknown>;

      const fundChange =
        result.fund_change ?? result.fundChange ?? result['fund_change'];
      const code = result.code ?? result['code'];
      const msg = result.msg ?? result['msg'];
      const subCode = result.sub_code ?? result.subCode ?? result['sub_code'];
      const subMsg = result.sub_msg ?? result.subMsg ?? result['sub_msg'];
      const success = fundChange === 'Y' || fundChange === 'y';

      this.logger.log(
        `alipay.trade.refund 响应 paymentId=${payment.id} outRequestNo=${options.outRequestNo} code=${code} msg=${msg} subCode=${subCode} subMsg=${subMsg} fund_change=${fundChange} fundChange=${result.fundChange} success=${success}`,
      );
      this.logger.debug(
        `alipay.trade.refund 完整响应 paymentId=${payment.id} keys=${Object.keys(result).join(',')} body=${JSON.stringify(result)}`,
      );

      return { success, rawResponse: result };
    } catch (err) {
      this.logger.error(
        `alipay.trade.refund 异常 paymentId=${payment.id} outRequestNo=${options.outRequestNo}`,
        (err as Error).stack,
      );
      throw new ServiceUnavailableException(
        `支付宝退款失败：${(err as Error).message}`,
      );
    }
  }
}
