import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * SSE 推送流：管理员建立长连接，新通知实时推送。
   * 注意：JWT 通过 query param token 传入，因为 EventSource 不支持自定义 Header。
   */
  @Sse('stream')
  stream(): Observable<MessageEvent> {

    return this.notificationsService.getStream().pipe(
      map((notification) => ({
        data: JSON.stringify(notification),
        type: 'notification',
      })),
    );
  }

  @Get()
  findAll(@Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAll(query);
  }

  @Get('unread-count')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount().then((count) => ({
      count,
    }));
  }

  @Patch('read-all')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }
}
