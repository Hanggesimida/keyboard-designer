'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type QueryNotificationsParams,
  type Notification,
} from '@/lib/api/notifications';
import { useUserStore } from '@/store/userStore';
import { useNotificationStore } from '@/store/notificationStore';

// 生产：Nginx 同域反代，使用相对路径 /api/...
// 开发：EventSource 不走 Next.js rewrite，需要直连后端
const SSE_BASE =
  process.env.NODE_ENV === 'production'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ['admin', 'notifications'] as const,
  lists: (params?: QueryNotificationsParams) =>
    [...notificationKeys.all, 'list', params] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * 第二层保障：TanStack Query 每 30 秒轮询，SSE 断线时兜底同步。
 * 查询结果同步到 notificationStore，保持 UI 状态一致。
 */
export function useNotifications(params?: QueryNotificationsParams) {
  const accessToken = useUserStore((s) => s.accessToken);

  return useQuery({
    queryKey: notificationKeys.lists(params),
    queryFn: () => getNotifications(params),
    enabled: !!accessToken,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * 封装了同步到 store 的版本（在 NotificationCenter 中使用）。
 */
export function useNotificationsWithSync(params?: QueryNotificationsParams) {
  const accessToken = useUserStore((s) => s.accessToken);
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  return useQuery({
    queryKey: notificationKeys.lists(params),
    queryFn: async () => {
      const data = await getNotifications(params);
      setNotifications(data.items, data.unreadCount);
      return data;
    },
    enabled: !!accessToken,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ─── SSE Hook ─────────────────────────────────────────────────────────────────

/**
 * 第一层保障：SSE 实时推送。
 * 管理员在后台页面时建立长连接，有新通知立即推入 store 并失效 Query 缓存。
 *
 * 注意：EventSource 不支持自定义 Header，所以 JWT token 通过 query param 传递。
 */
export function useNotificationSSE() {
  const accessToken = useUserStore((s) => s.accessToken);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // 避免重复连接
    if (esRef.current) {
      esRef.current.close();
    }

    const url = `${SSE_BASE}/api/admin/notifications/stream?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('notification', (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        // 推入 store（触发铃铛红点、概览列表更新）
        addNotification(notification);
        // 失效缓存，下次 refetch 会拉取最新列表
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      } catch {
        // 解析失败忽略
      }
    });

    es.onerror = () => {
      // EventSource 会自动重连，无需手动处理
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [accessToken, addNotification, queryClient]);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const markRead = useNotificationStore((s) => s.markRead);

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      // 乐观更新 store
      markRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: () => {
      // 失败时 Query 重新拉取会恢复真实状态
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () => {
      markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
