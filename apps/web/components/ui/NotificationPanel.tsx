'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CheckCheck, ShoppingBag, XCircle, RefreshCw, Bell } from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/api/notifications';

// ─── 通知类型配置 ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; iconCls: string; dotCls: string }
> = {
  ORDER_PAID: {
    icon: ShoppingBag,
    iconCls: 'text-sky-400',
    dotCls: 'bg-sky-400',
  },
  ORDER_CANCELLED: {
    icon: XCircle,
    iconCls: 'text-white/40',
    dotCls: 'bg-white/30',
  },
  ORDER_REFUND_REQUEST: {
    icon: RefreshCw,
    iconCls: 'text-rose-400',
    dotCls: 'bg-rose-400',
  },
};

// ─── 单条通知 ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;
  const orderId = notification.data?.orderId as string | undefined;

  const inner = (
    <div
      className={[
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
        notification.isRead
          ? 'opacity-50 hover:opacity-70 hover:bg-white/[0.03]'
          : 'hover:bg-white/[0.05]',
      ].join(' ')}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div
        className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.05] ${cfg.iconCls}`}
      >
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-white/80 truncate">{notification.title}</p>
          {!notification.isRead && (
            <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-white/45 leading-relaxed line-clamp-2">
          {notification.body}
        </p>
        <p className="mt-1 text-[10px] text-white/25">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: zhCN,
          })}
        </p>
      </div>
    </div>
  );

  if (orderId) {
    return (
      <Link href={`/admin/orders/${orderId}`} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

// ─── 通知面板 ─────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose?: () => void;
}

export function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps) {
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="w-80 rounded-xl bg-[#161616] shadow-2xl shadow-black/50 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white/70">通知</span>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors"
          >
            <CheckCheck size={12} />
            全部已读
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="max-h-[360px] overflow-y-auto py-1 px-1 scrollbar-thin">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={20} className="text-white/15" />
            <p className="text-xs text-white/25">暂无通知</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="border-t border-white/[0.06] px-3 py-2">
          <Link
            href="/admin/orders"
            onClick={onClose}
            className="block text-center text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            查看全部订单
          </Link>
        </div>
      )}
    </div>
  );
}
