'use client';

import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCheck, ShoppingBag, XCircle, RefreshCw, Bell, type LucideIcon } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import type { Notification, NotificationType } from '@/lib/api/notifications';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@workspace/ui/components/item';
import { Link } from '@/i18n/navigation';

// ─── 通知类型配置 ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: LucideIcon; iconCls: string; dotCls: string }
> = {
  ORDER_PAID: {
    icon: ShoppingBag,
    iconCls: 'text-sky-400',
    dotCls: 'bg-rose-500/80',
  },
  ORDER_CANCELLED: {
    icon: XCircle,
    iconCls: 'text-white/30',
    dotCls: 'bg-rose-500/80',
  },
  ORDER_REFUND_REQUEST: {
    icon: RefreshCw,
    iconCls: 'text-rose-400',
    dotCls: 'bg-rose-500/80',
  },
};

// ─── 单条通知 ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const locale = useLocale();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;
  const orderId = notification.data?.orderId as string | undefined;

  const inner = (
    <Item
      size="xs"
      variant="default"
      className={cn(
        'cursor-pointer transition-colors',
        notification.isRead
          ? 'opacity-50 hover:opacity-70 hover:bg-muted/50'
          : 'hover:bg-muted/50'
      )}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <ItemMedia
        variant="icon"
        className={cn('w-7 h-7 rounded-lg bg-muted', cfg.iconCls)}
      >
        <Icon size={13} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="text-xs font-medium">
          {notification.title}
          {!notification.isRead && (
            <span className={cn('shrink-0 w-1.5 h-1.5 rounded-full', cfg.dotCls)} />
          )}
        </ItemTitle>
        <ItemDescription>{notification.body}</ItemDescription>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </p>
      </ItemContent>
    </Item>
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
  const t = useTranslations('Admin.notifications');
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-sm font-semibold text-foreground">{t('title')}</span>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-[11px] text-violet-400/60 hover:text-violet-400 transition-colors cursor-pointer"
          >
            <CheckCheck size={12} />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* 列表 */}
      <div className="max-h-[360px] overflow-y-auto py-1 px-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell size={20} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/50">{t('empty')}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/admin/orders"
            onClick={onClose}
            className="block text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {t('viewAllOrders')}
          </Link>
        </div>
      )}
    </div>
  );
}
