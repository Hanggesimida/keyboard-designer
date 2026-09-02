'use client';

import { forwardRef } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@workspace/ui/lib/utils';

interface NotificationBellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  unreadCount: number;
  isOpen?: boolean;
}

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ unreadCount, isOpen, className, ...props }, ref) => {
    const t = useTranslations('Admin.notifications');
    return (
      <button
        ref={ref}
        aria-label={unreadCount > 0 ? t('unread', { count: unreadCount }) : t('title')}
        className={cn(
          'relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer',
          isOpen
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent',
          className
        )}
        {...props}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-rose-500/80 text-destructive-foreground text-[10px] leading-none font-medium px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }
);

NotificationBell.displayName = 'NotificationBell';
