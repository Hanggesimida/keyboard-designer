import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma, OrderStatus } from 'generated/prisma/client';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// ─── 状态机：合法的状态流转表 ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PAID]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.APPROVED]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING],
  [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED],
  [OrderStatus.REFUNDING]: [OrderStatus.REFUNDED],
};

@Injectable()
export class AdminOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAdminOrdersDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status?.length && { status: { in: status } }),
      ...(search && {
        OR: [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
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
          updatedAt: true,
          addressSnapshot: true,
          user: { select: { id: true, email: true } },
          design: { select: { id: true, name: true, previewUrl: true } },
          payment: { select: { method: true, status: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        design: { select: { id: true, name: true, previewUrl: true } },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`订单 ${id} 不存在`);
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException(`订单 ${id} 不存在`);
    }

    this.validateTransition(order.status, dto.status);

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        user: { select: { id: true, email: true } },
        design: { select: { id: true, name: true, previewUrl: true } },
        payment: true,
      },
    });
  }

  /** 返回生产看板数据：APPROVED（待生产）+ PROCESSING（生产中）的订单 */
  async getProductionBoard() {
    const items = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.APPROVED, OrderStatus.PROCESSING] },
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'asc' },
      ],
      select: {
        id: true,
        orderNo: true,
        status: true,
        quantity: true,
        totalAmount: true,
        note: true,
        updatedAt: true,
        createdAt: true,
        designSnapshot: true,
        design: { select: { id: true, name: true, previewUrl: true } },
        user: { select: { id: true, email: true } },
      },
    });

    return { items, total: items.length };
  }

  /** 校验状态流转合法性，非法则抛 BadRequestException */
  private validateTransition(from: OrderStatus, to: OrderStatus): void {
    const allowed = VALID_TRANSITIONS[from];

    if (!allowed || !allowed.includes(to)) {
      throw new BadRequestException(
        `不允许将订单状态从 ${from} 变更为 ${to}`,
      );
    }
  }

  /** 返回当前状态下可流转到的目标状态列表（供前端渲染操作按钮） */
  getAvailableTransitions(status: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[status] ?? [];
  }
}
