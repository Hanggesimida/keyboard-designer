import type { Order, Payment } from 'generated/prisma/client';

/**
 * 支付结果：provider 创建支付后返回给前端的数据
 * （例如支付宝返回支付页面 URL，微信返回 prepay_id 等）
 */
export interface PaymentResult {
  /** 供前端跳转/唤起的支付参数，结构因渠道而异 */
  payData: Record<string, unknown>;
}

/**
 * 回调校验结果
 */
export interface VerifyResult {
  success: boolean;
  orderId: string;
}

/**
 * 支付渠道 Provider 接口。
 *
 * 每种支付方式（支付宝、微信等）各自实现此接口，
 * PaymentService 通过该接口与具体渠道解耦，
 * 新增渠道只需新增 Provider 实现 + 注册到 PaymentModule，不改动其他代码。
 */
export interface IPaymentProvider {
  /**
   * 发起支付：向第三方平台创建支付订单，返回前端所需的支付参数。
   */
  createPayment(order: Order, payment: Payment): Promise<PaymentResult>;

  /**
   * 校验第三方回调：验签并解析回调数据，返回标准化结果。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifyCallback(rawBody: any): Promise<VerifyResult>;
}
