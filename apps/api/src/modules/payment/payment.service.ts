import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma/prisma.service';
import { OrderService } from '@modules/order/order.service';
import { NotificationsService } from '@modules/admin/notifications/notifications.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatProvider } from './providers/wechat.provider';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MockCallbackDto } from './dto/mock-callback.dto';
import { isAlipayEnabled } from './config/alipay.config';
import {
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  Prisma,
} from 'generated/prisma/client';

const REFUNDABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.APPROVED,
  OrderStatus.PROCESSING,
];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orderService: OrderService,
    private readonly notificationsService: NotificationsService,
    private readonly alipayProvider: AlipayProvider,
    private readonly wechatProvider: WechatProvider,
  ) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.orderService.findOne(dto.orderId, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('该订单当前状态不允许发起支付');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (existing) {
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException('该订单已完成支付');
      }
      return this.createProviderPayment(order, existing, dto.method);
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amount: order.totalAmount,
      },
    });

    return this.createProviderPayment(order, payment, dto.method);
  }

  async mockCallback(dto: MockCallbackDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录 ${dto.paymentId} 不存在`);
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('该支付记录已完成');
    }

    const [, updatedOrder] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      }),
    ]);

    this.notifyOrderPaid(updatedOrder).catch(() => {});

    const updatedPayment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });

    return { success: true, payment: updatedPayment };
  }

  async handleAlipayNotify(rawBody: Record<string, string>) {
    const result = await this.alipayProvider.verifyCallback(rawBody);

    if (!result.success) {
      return 'success';
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: result.paymentId },
      include: { order: true },
    });

    if (!payment) {
      return 'success';
    }

    if (payment.status === PaymentStatus.PAID) {
      return 'success';
    }

    const [, updatedOrder] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          thirdPartyId: rawBody.trade_no,
          thirdPartyData: rawBody as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      }),
    ]);

    this.notifyOrderPaid(updatedOrder).catch(() => {});

    return 'success';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWechatNotify(rawBody: any) {
    await this.wechatProvider.verifyCallback(rawBody);
    return { code: 'SUCCESS', message: '成功' };
  }

  async refundByAdmin(orderId: string, operatorId: string, reason?: string) {
    this.logger.log(
      `管理员发起退款 orderId=${orderId} operatorId=${operatorId} reason=${reason ?? '(无)'}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        user: { select: { id: true, email: true } },
        design: { select: { id: true, name: true, previewUrl: true } },
      },
    });

    if (!order) {
      this.logger.warn(`退款失败：订单不存在 orderId=${orderId}`);
      throw new NotFoundException(`订单 ${orderId} 不存在`);
    }

    if (!REFUNDABLE_ORDER_STATUSES.includes(order.status)) {
      this.logger.warn(
        `退款失败：订单状态不允许 orderId=${orderId} orderNo=${order.orderNo} status=${order.status}`,
      );
      throw new BadRequestException('该订单当前状态不允许退款');
    }

    const payment = order.payment;

    if (!payment) {
      this.logger.warn(
        `退款失败：无支付记录 orderId=${orderId} orderNo=${order.orderNo}`,
      );
      throw new BadRequestException('该订单没有支付记录');
    }

    if (payment.method !== PaymentMethod.ALIPAY) {
      this.logger.warn(
        `退款失败：非支付宝支付 orderId=${orderId} paymentMethod=${payment.method}`,
      );
      throw new BadRequestException('仅支持支付宝支付的订单退款');
    }

    if (payment.status !== PaymentStatus.PAID) {
      this.logger.warn(
        `退款失败：支付状态不允许 orderId=${orderId} paymentId=${payment.id} paymentStatus=${payment.status}`,
      );
      throw new BadRequestException('该订单支付状态不允许退款');
    }

    if (!payment.thirdPartyId) {
      this.logger.warn(
        `退款失败：缺少支付宝交易号 orderId=${orderId} paymentId=${payment.id}`,
      );
      throw new BadRequestException('缺少支付宝交易号，无法退款');
    }

    const existingRefund = await this.prisma.refund.findFirst({
      where: { orderId, status: RefundStatus.SUCCESS },
    });

    if (existingRefund) {
      this.logger.log(
        `退款跳过：已存在成功退款记录 orderId=${orderId} refundId=${existingRefund.id}`,
      );
      return this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          user: { select: { id: true, email: true } },
          design: { select: { id: true, name: true, previewUrl: true } },
          payment: true,
        },
      });
    }

    const outRequestNo = `RF-${order.orderNo}-${Date.now()}`;
    const refundAmount = payment.amount.toString();

    this.logger.log(
      `准备调用支付宝退款 orderId=${orderId} orderNo=${order.orderNo} paymentId=${payment.id} tradeNo=${payment.thirdPartyId} amount=${refundAmount} outRequestNo=${outRequestNo}`,
    );

    const refund = await this.prisma.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amount: payment.amount,
        outRequestNo,
        reason,
        operatorId,
        status: RefundStatus.PENDING,
      },
    });

    let refundResult: { success: boolean; rawResponse: Record<string, unknown> };

    try {
      refundResult = await this.alipayProvider.refund(payment, {
        amount: refundAmount,
        outRequestNo,
        reason,
      });
    } catch (err) {
      this.logger.error(
        `支付宝退款接口异常 orderId=${orderId} refundId=${refund.id} outRequestNo=${outRequestNo}`,
        (err as Error).stack,
      );
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.FAILED },
      });
      throw err;
    }

    this.logger.log(
      `支付宝退款接口返回 orderId=${orderId} refundId=${refund.id} success=${refundResult.success} rawResponse=${JSON.stringify(refundResult.rawResponse)}`,
    );

    if (!refundResult.success) {
      this.logger.warn(
        `支付宝退款判定失败 orderId=${orderId} refundId=${refund.id} outRequestNo=${outRequestNo} rawResponse=${JSON.stringify(refundResult.rawResponse)}`,
      );
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          thirdPartyData:
            refundResult.rawResponse as unknown as Prisma.InputJsonValue,
        },
      });
      throw new BadRequestException('支付宝退款未成功，请稍后重试');
    }

    await this.prisma.$transaction([
      this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.SUCCESS,
          thirdPartyData:
            refundResult.rawResponse as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REFUNDED },
      }),
    ]);

    this.logger.log(
      `退款完成 orderId=${orderId} orderNo=${order.orderNo} refundId=${refund.id} outRequestNo=${outRequestNo}`,
    );

    return this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true } },
        design: { select: { id: true, name: true, previewUrl: true } },
        payment: true,
      },
    });
  }

  private async createProviderPayment(
    order: { id: string; orderNo: string; totalAmount: { toString(): string } },
    payment: { id: string; method: PaymentMethod; amount: { toString(): string } },
    method: PaymentMethod,
  ) {
    const useAlipay =
      method === PaymentMethod.ALIPAY && isAlipayEnabled(this.config);

    if (!useAlipay) {
      return this.buildInitiateResponse(payment.id, method);
    }

    try {
      const provider =
        method === PaymentMethod.ALIPAY
          ? this.alipayProvider
          : this.wechatProvider;

      const fullOrder = await this.prisma.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const fullPayment = await this.prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });

      const result = await provider.createPayment(fullOrder, fullPayment);
      return { paymentId: payment.id, method, ...result };
    } catch {
      return this.buildInitiateResponse(payment.id, method);
    }
  }

  private async notifyOrderPaid(order: {
    id: string;
    orderNo: string;
    totalAmount: { toString(): string };
  }) {
    await this.notificationsService.create({
      type: NotificationType.ORDER_PAID,
      title: '新订单待处理',
      body: `订单 ${order.orderNo} 已完成支付，等待接单`,
      data: {
        orderId: order.id,
        orderNo: order.orderNo,
        amount: order.totalAmount.toString(),
      },
    });
  }

  private buildInitiateResponse(paymentId: string, method: PaymentMethod) {
    return {
      paymentId,
      method,
      mockPayUrl: `/payments/mock-callback`,
      tip: '当前为开发模式，请调用 mockPayUrl 完成伪支付',
    };
  }
}
