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
import { NotificationType, OrderStatus } from 'generated/prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // 1. 验证设计方案归属
    const design = await this.prisma.design.findUnique({
      where: { id: dto.designId },
    });

    if (!design) {
      throw new NotFoundException(`设计方案 ${dto.designId} 不存在`);
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('无权使用该设计方案下单');
    }

    // 2. 验证收货地址归属
    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId },
    });

    if (!address) {
      throw new NotFoundException(`收货地址 ${dto.addressId} 不存在`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('无权使用该收货地址');
    }

    // 3. 服务端计算价格，前端不可传入金额
    const quote = this.pricingService.quote({
      type: 'CUSTOM_KEYCAP',
      designId: dto.designId,
    });

    // 4. 生成订单号并创建订单（含双快照）
    const orderNo = this.generateOrderNo();

    return this.prisma.order.create({
      data: {
        orderNo,
        userId,
        designId: dto.designId,
        addressId: dto.addressId,
        totalAmount: quote.totalAmount,
        note: dto.note,
        // 固化设计快照，防止设计后续修改影响历史订单
        designSnapshot: design.data as object,
        // 固化地址快照，防止地址被修改或删除后影响历史订单
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

  // 生成可读订单号：JW-YYYYMMDD-XXXXX（5位大写字母+数字随机串）
  private generateOrderNo(): string {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const suffix = Math.random()
      .toString(36)
      .toUpperCase()
      .slice(2, 7);
    return `JW-${date}-${suffix}`;
  }
}
