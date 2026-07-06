import { request } from './request';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED';

export interface OrderDesignSummary {
  id: string;
  name: string;
  previewUrl: string | null;
}

export interface OrderPaymentSummary {
  method: 'ALIPAY' | 'WECHAT';
  status: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
}

export interface AddressSnapshot {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}

/** 订单列表摘要（不含完整快照，用于列表页轻量展示） */
export interface OrderSummary {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  addressSnapshot: AddressSnapshot;
  design: OrderDesignSummary;
  payment: OrderPaymentSummary | null;
}

/** 完整订单（含设计/地址快照，用于详情页） */
export interface Order extends OrderSummary {
  userId: string;
  designId: string;
  addressId: string;
  updatedAt: string;
  designSnapshot: unknown;
  payment: (OrderPaymentSummary & {
    id: string;
    amount: string;
    paidAt: string | null;
    thirdPartyId: string | null;
    createdAt: string;
  }) | null;
}

export interface CreateOrderPayload {
  designId: string;
  addressId: string;
  note?: string;
}

export interface QueryOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
}

export interface PaginatedOrders {
  total: number;
  page: number;
  limit: number;
  items: OrderSummary[];
}

// ─── API Functions ───────────────────────────────────────────────────────────

export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return request<Order>('/orders', { method: 'POST', body: payload });
}

export function listOrders(params?: QueryOrdersParams): Promise<PaginatedOrders> {
  return request<PaginatedOrders>('/orders', { params });
}

export function getOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export function cancelOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}/cancel`, { method: 'POST' });
}
