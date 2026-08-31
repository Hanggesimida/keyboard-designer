import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { PrismaService } from '@prisma/prisma.service';
import { Notification } from 'generated/prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  // RxJS Subject 作为进程内 SSE 广播总线。
  // 未来多实例部署时，替换为 Redis Pub/Sub 即可，其余逻辑不变。
  private readonly subject = new Subject<Notification>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    this.subject.complete();
  }

  /** 创建通知：写库 + 广播到 SSE 流 */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? undefined,
      },
    });

    this.subject.next(notification);
    return notification;
  }

  /** 分页查询通知列表 */
  async findAll(query: QueryNotificationsDto) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(isRead !== undefined && { isRead }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { isRead: false },
    });

    return { total, page, limit, items, unreadCount };
  }

  /** 标记单条已读 */
  async markRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /** 全部标记已读 */
  async markAllRead(): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  /** 获取未读数量 */
  async getUnreadCount(): Promise<number> {
    return this.prisma.notification.count({ where: { isRead: false } });
  }

  /** 返回 SSE Observable，供 Controller 的 @Sse() 端点订阅 */
  getStream(): Observable<Notification> {
    return this.subject.asObservable();
  }
}
