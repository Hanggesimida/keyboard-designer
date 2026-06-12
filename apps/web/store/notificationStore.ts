import { create } from 'zustand';
import type { Notification } from '@/lib/api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isPanelOpen: boolean;

  // 同步整批数据（来自 TanStack Query 轮询结果）
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  // SSE 推送单条新通知时追加到列表头部
  addNotification: (notification: Notification) => void;
  // 标记单条已读（乐观更新）
  markRead: (id: string) => void;
  // 全部标记已读（乐观更新）
  markAllRead: () => void;

  togglePanel: () => void;
  closePanel: () => void;
  setIsPanelOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isPanelOpen: false,

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  closePanel: () => set({ isPanelOpen: false }),
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),
}));
