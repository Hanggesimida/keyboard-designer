import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { PricingService } from '@modules/pricing/pricing.service';
import { NotificationsService } from '@modules/admin/notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { BatchCreateOrderDto } from './dto/batch-create-order.dto';
import {
  ORDER_QUANTITY_MAX,
  ORDER_QUANTITY_MIN,
} from './order.constants';
import {
  AccountType,
  DesignStatus,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'generated/prisma/client';

export interface OrderRequestUser {
  id: string;
  accountType: AccountType;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(user: OrderRequestUser, dto: CreateOrderDto) {
    if (user.accountType === AccountType.ENTERPRISE_SUB) {
      throw new ForbiddenException(
        '企业子账号不能下单，请将设计方案提交给主账号处理',
      );
    }

    if (user.accountType === AccountType.ENTERPRISE_MAIN) {
      return this.createEnterpriseOrder(user.id, dto);
    }

    return this.createPaidOrder(user.id, dto);
  }

  /** 企业主账号批量下单：逐条独立处理，互不阻塞 */
  async createBatch(user: OrderRequestUser, dto: BatchCreateOrderDto) {
    if (user.accountType !== AccountType.ENTERPRISE_MAIN) {
      throw new ForbiddenException('仅企业主账号可批量下单');
    }

    const results = await Promise.allSettled(
      dto.items.map((item) => this.createEnterpriseOrder(user.id, item)),
    );

    const success: unknown[] = [];
    const failed: { designId: string; reason: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(result.value);
      } else {
        const reason =
          result.reason instanceof Error ? result.reason.message : '下单失败';
        failed.push({ designId: dto.items[index].designId, reason });
      }
    });

    return { success, failed };
  }

  async findAllByUser(userId: string, query: QueryOrdersDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status }),
      ...(search && {
        orderNo: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNo: true,
          status: true,
          quantity: true,
          totalAmount: true,
          note: true,
          paidAt: true,
          createdAt: true,
          addressSnapshot: true,
          design: { select: { id: true, name: true, previewUrl: true } },
          payment: { select: { method: true, status: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        design: { select: { id: true, name: true, previewUrl: true } },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`订单 ${id} 不存在`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('无权访问该订单');
    }

    return order;
  }

  async cancel(id: string, userId: string) {
    const order = await this.findOne(id, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('仅待支付的订单可以取消');
    }

    const cancelled = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    // 取消成功后通知管理员（fire-and-forget）
    this.notificationsService
      .create({
        type: NotificationType.ORDER_CANCELLED,
        title: '订单已取消',
        body: `订单 ${cancelled.orderNo} 已被用户取消`,
        data: {
          orderId: cancelled.id,
          orderNo: cancelled.orderNo,
          userId: cancelled.userId,
        },
      })
      .catch(() => {
        // 通知创建失败不影响主流程
      });

    return cancelled;
  }

  // 供 PaymentService 内部调用，将订单标记为已支付
  async markAsPaid(id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.PAID, paidAt: new Date() },
    });
  }

  /** 普通用户下单：走 PENDING → 在线支付流程 */
  private async createPaidOrder(userId: string, dto: CreateOrderDto) {
    const design = await this.prisma.design.findUnique({
      where: { id: dto.designId },
    });

    if (!design) {
      throw new NotFoundException(`设计方案 ${dto.designId} 不存在`);
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('无权使用该设计方案下单');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });

    if (!address) {
      throw new NotFoundException(`收货地址 ${dto.addressId} 不存在`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('无权使用该收货地址');
    }

    const quote = this.buildQuote(dto);

    return this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        userId,
        designId: dto.designId,
        addressId: dto.addressId,
        quantity: quote.quantity,
        totalAmount: quote.totalAmount,
        note: dto.note,
        designSnapshot: design.data as object,
        addressSnapshot: {
          name: address.name,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district,
          detail: address.detail,
        },
      },
      include: {
        design: { select: { id: true, name: true, previewUrl: true } },
        address: true,
      },
    });
  }

  /**
   * 企业主账号下单：可对自己或已提交/已下单的子账号团队设计下单，支持重复下单。
   * 免支付（月结），订单直接落地为 PAID，并将设计标记为 ORDERED。
   */
  private async createEnterpriseOrder(mainUserId: string, dto: CreateOrderDto) {
    const design = await this.prisma.design.findUnique({
      where: { id: dto.designId },
      include: { user: { select: { id: true, parentId: true } } },
    });

    if (!design) {
      throw new NotFoundException(`设计方案 ${dto.designId} 不存在`);
    }

    const isOwnDesign = design.userId === mainUserId;
    const isTeamDesign =
      design.user.parentId === mainUserId &&
      (design.status === DesignStatus.SUBMITTED ||
        design.status === DesignStatus.ORDERED);

    if (!isOwnDesign && !isTeamDesign) {
      throw new ForbiddenException('只能对本人设计或已提交的团队设计下单');
    }

    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });

    if (!address) {
      throw new NotFoundException(`收货地址 ${dto.addressId} 不存在`);
    }

    if (address.userId !== mainUserId) {
      throw new ForbiddenException('无权使用该收货地址');
    }

    const quote = this.buildQuote(dto);

    const orderNo = this.generateOrderNo();
    const now = new Date();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          userId: mainUserId,
          designId: dto.designId,
          addressId: dto.addressId,
          quantity: quote.quantity,
          totalAmount: quote.totalAmount,
          note: dto.note,
          status: OrderStatus.PAID,
          paidAt: now,
          designSnapshot: design.data as object,
          addressSnapshot: {
            name: address.name,
            phone: address.phone,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail,
          },
        },
        include: {
          design: { select: { id: true, name: true, previewUrl: true } },
          address: true,
        },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          method: PaymentMethod.MONTHLY,
          status: PaymentStatus.PAID,
          amount: quote.totalAmount,
          paidAt: now,
        },
      });

      await tx.design.update({
        where: { id: dto.designId },
        data: { status: DesignStatus.ORDERED },
      });

      return created;
    });

    this.notificationsService
      .create({
        type: NotificationType.ORDER_PAID,
        title: '新订单待处理',
        body: `订单 ${order.orderNo} 已完成下单（月结），等待接单`,
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          amount: order.totalAmount.toString(),
        },
      })
      .catch(() => {});

    return order;
  }

  // 生成可读订单号：JW-YYYYMMDD-XXXXX（5位大写字母+数字随机串）
  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 7);
    return `JW-${date}-${suffix}`;
  }

  private resolveQuantity(dto: CreateOrderDto): number {
    const quantity = dto.quantity ?? ORDER_QUANTITY_MIN;
    return Math.min(ORDER_QUANTITY_MAX, Math.max(ORDER_QUANTITY_MIN, quantity));
  }

  private buildQuote(dto: CreateOrderDto) {
    const quantity = this.resolveQuantity(dto);
    return this.pricingService.quote({
      type: 'CUSTOM_KEYCAP',
      designId: dto.designId,
      quantity,
    });
  }
}
