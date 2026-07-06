import { request } from './request';
import type { OrderStatus, AddressSnapshot, OrderPaymentSummary } from './orders';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminOrderUserSummary {
  id: string;
  email: string;
}

export interface AdminOrderDesignSummary {
  id: string;
  name: string;
  previewUrl: string | null;
}

/** 管理员订单列表摘要 */
export interface AdminOrderSummary {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  addressSnapshot: AddressSnapshot;
  user: AdminOrderUserSummary;
  design: AdminOrderDesignSummary;
  payment: OrderPaymentSummary | null;
}

/** 管理员订单详情（含完整快照和支付信息） */
export interface AdminOrder extends AdminOrderSummary {
  userId: string;
  designId: string;
  addressId: string;
  designSnapshot: unknown;
  payment: (OrderPaymentSummary & {
    id: string;
    amount: string;
    paidAt: string | null;
    thirdPartyId: string | null;
    createdAt: string;
  }) | null;
}

export interface QueryAdminOrdersParams {
  page?: number;
  limit?: number;
  /** 支持多选，对应后端 ?status=PAID&status=APPROVED */
  status?: OrderStatus[];
  search?: string;
}

export interface PaginatedAdminOrders {
  total: number;
  page: number;
  limit: number;
  items: AdminOrderSummary[];
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  adminNote?: string;
}

/** 生产看板订单条目 */
export interface ProductionBoardItem {
  id: string;
  orderNo: string;
  status: 'APPROVED' | 'PROCESSING';
  totalAmount: string;
  note: string | null;
  updatedAt: string;
  createdAt: string;
  designSnapshot: unknown;
  design: AdminOrderDesignSummary;
  user: AdminOrderUserSummary;
}

export interface ProductionBoardResult {
  items: ProductionBoardItem[];
  total: number;
}

// ─── 状态机：前端可用流转（与后端保持一致） ────────────────────────────────────

export const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PROCESSING'],
  PROCESSING: ['SHIPPING'],
  SHIPPING: ['COMPLETED'],
  REFUNDING: ['REFUNDED'],
};

export function canRefundOrder(order: {
  status: OrderStatus;
  payment: (OrderPaymentSummary & { id?: string }) | null;
}): boolean {
  const refundableStatuses: OrderStatus[] = ['PAID', 'APPROVED', 'PROCESSING'];
  return (
    refundableStatuses.includes(order.status) &&
    order.payment?.method === 'ALIPAY' &&
    order.payment?.status === 'PAID'
  );
}

export function getAvailableTransitions(status: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

// ─── API Functions ───────────────────────────────────────────────────────────

export function listAdminOrders(params?: QueryAdminOrdersParams): Promise<PaginatedAdminOrders> {
  return request<PaginatedAdminOrders>('/admin/orders', { params });
}

export function getAdminOrder(id: string): Promise<AdminOrder> {
  return request<AdminOrder>(`/admin/orders/${id}`);
}

export function updateOrderStatus(id: string, payload: UpdateOrderStatusPayload): Promise<AdminOrder> {
  return request<AdminOrder>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: payload,
  });
}

export function refundOrder(id: string, reason?: string): Promise<AdminOrder> {
  return request<AdminOrder>(`/admin/orders/${id}/refund`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export function getProductionBoard(): Promise<ProductionBoardResult> {
  return request<ProductionBoardResult>('/admin/orders/production-board');
}
