'use client';

import { forwardRef } from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  unreadCount: number;
  isOpen?: boolean;
}

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ unreadCount, isOpen, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={`通知${unreadCount > 0 ? `（${unreadCount} 条未读）` : ''}`}
        className={[
          'relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
          isOpen
            ? 'bg-white/[0.08] text-white/80'
            : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]',
        ].join(' ')}
        {...props}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px]  rounded-full bg-rose-500 text-white text-[6px] leading-none font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }
);

NotificationBell.displayName = 'NotificationBell';
