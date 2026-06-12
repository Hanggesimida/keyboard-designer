import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { OrderService } from '@modules/order/order.service';
import { NotificationsService } from '@modules/admin/notifications/notifications.service';
import { AlipayProvider } from './providers/alipay.provider';
import { WechatProvider } from './providers/wechat.provider';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { MockCallbackDto } from './dto/mock-callback.dto';
import { NotificationType, OrderStatus, PaymentMethod, PaymentStatus } from 'generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly notificationsService: NotificationsService,
    private readonly alipayProvider: AlipayProvider,
    private readonly wechatProvider: WechatProvider,
  ) {}

  /**
   * 发起支付：为 PENDING 订单创建支付记录，并调用对应渠道 Provider。
   * 当前 Provider 均为桩位，返回 mockPayUrl 供开发测试使用。
   */
  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.orderService.findOne(dto.orderId, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('该订单当前状态不允许发起支付');
    }

    // 防止重复发起（订单已有 UNPAID 支付记录则直接返回）
    const existing = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (existing) {
      if (existing.status === PaymentStatus.PAID) {
        throw new ConflictException('该订单已完成支付');
      }
      return this.buildInitiateResponse(existing.id, dto.method);
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amount: order.totalAmount,
      },
    });

    // 调用渠道 Provider（当前为桩位，会抛出 ServiceUnavailableException）
    // 生产环境接入后，Provider 会返回真实支付参数替换 mockPayUrl
    try {
      const provider =
        dto.method === PaymentMethod.ALIPAY
          ? this.alipayProvider
          : this.wechatProvider;

      const result = await provider.createPayment(order as any, payment);
      return { paymentId: payment.id, ...result };
    } catch {
      // Provider 尚未接入时，降级返回伪支付链接，便于开发联调
      return this.buildInitiateResponse(payment.id, dto.method);
    }
  }

  /**
   * 伪支付回调（仅用于开发/测试环境）。
   * 生产环境应通过支付宝/微信的异步通知接口触发真实状态变更。
   */
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

    // 使用事务确保 Payment 和 Order 状态同步更新
    const [updatedPayment, updatedOrder] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      }),
    ]);

    // 支付成功后触发管理员通知（fire-and-forget，不阻塞响应）
    this.notificationsService
      .create({
        type: NotificationType.ORDER_PAID,
        title: '新订单待处理',
        body: `订单 ${updatedOrder.orderNo} 已完成支付，等待接单`,
        data: {
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          amount: updatedOrder.totalAmount.toString(),
        },
      })
      .catch(() => {
        // 通知创建失败不影响主流程
      });

    return { success: true, payment: updatedPayment };
  }

  /**
   * 支付宝异步通知（预留桩位）。
   * TODO: 接入支付宝后，在此处完成验签、状态变更逻辑，并调用 notifyOrderPaid。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleAlipayNotify(rawBody: any) {
    await this.alipayProvider.verifyCallback(rawBody);
    // TODO: const order = await this.orderService.markAsPaid(orderId);
    // TODO: await this.notifyOrderPaid(order);
    return 'success';
  }

  /**
   * 微信支付通知（预留桩位）。
   * TODO: 接入微信支付后，在此处完成验签、状态变更逻辑，并调用 notifyOrderPaid。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWechatNotify(rawBody: any) {
    await this.wechatProvider.verifyCallback(rawBody);
    // TODO: const order = await this.orderService.markAsPaid(orderId);
    // TODO: await this.notifyOrderPaid(order);
    return { code: 'SUCCESS', message: '成功' };
  }

  /** 复用：真实支付渠道回调成功后触发管理员通知 */
  private async notifyOrderPaid(order: { id: string; orderNo: string; totalAmount: { toString(): string } }) {
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
      // 开发测试用伪支付入口，生产环境由 Provider 替换为真实支付参数
      mockPayUrl: `/payments/mock-callback`,
      tip: '当前为开发模式，请调用 mockPayUrl 完成伪支付',
    };
  }
}
