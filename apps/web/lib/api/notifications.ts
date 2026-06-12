import { request } from './request';

// ─── Types ─────────────────────────────────────────────────────────────────

export type NotificationType = 'ORDER_PAID' | 'ORDER_CANCELLED' | 'ORDER_REFUND_REQUEST';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  total: number;
  page: number;
  limit: number;
  items: Notification[];
  unreadCount: number;
}

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

// ─── API Functions ─────────────────────────────────────────────────────────

export async function getNotifications(
  params?: QueryNotificationsParams,
): Promise<NotificationsResponse> {
  return request<NotificationsResponse>('/admin/notifications', { params });
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/admin/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return request<Notification>(`/admin/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  return request<{ count: number }>('/admin/notifications/read-all', {
    method: 'PATCH',
  });
}
