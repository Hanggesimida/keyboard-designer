'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { NotificationBell } from '@/modules/admin/components/notification/NotificationBell';
import { NotificationPanel } from '@/modules/admin/components/notification/NotificationPanel';
import { useNotificationStore } from '@/store/notificationStore';
import {
  useNotificationsWithSync,
  useNotificationSSE,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/queries/admin/useAdminNotifications';

/**
 * 通知中心：铃铛 + 面板的组合组件。
 * 挂载后自动：
 *   1. 建立 SSE 长连接（第一层：实时推送）
 *   2. 启动 30 秒轮询（第二层：断线兜底）
 */
export function NotificationCenter() {
  const { isPanelOpen, setIsPanelOpen, closePanel, notifications, unreadCount } =
    useNotificationStore();

  // 启动 SSE 连接
  useNotificationSSE();

  // 启动轮询（同时初始化 store 数据）
  useNotificationsWithSync({ limit: 30 });

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  return (
    <Popover open={isPanelOpen} onOpenChange={setIsPanelOpen}>
      <PopoverTrigger render={<NotificationBell unreadCount={unreadCount} isOpen={isPanelOpen} />} />
      <PopoverContent
        align="start"
        sideOffset={8}
        className="p-0"
        collisionPadding={16}
      >
        <NotificationPanel
          notifications={notifications}
          onMarkRead={(id) => markRead(id)}
          onMarkAllRead={() => markAllRead()}
          onClose={closePanel}
        />
      </PopoverContent>
    </Popover>
  );
}
