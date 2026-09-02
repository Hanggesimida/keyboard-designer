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
  method: 'ALIPAY' | 'WECHAT' | 'MONTHLY';
  status: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
}

export const PAYMENT_METHOD_LABEL: Record<OrderPaymentSummary['method'], string> = {
  ALIPAY: 'ALIPAY',
  WECHAT: 'WECHAT',
  MONTHLY: 'MONTHLY',
};

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
  quantity: number;
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
  quantity?: number;
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

export interface BatchCreateOrderPayload {
  items: CreateOrderPayload[];
}

export interface BatchCreateOrderResult {
  success: Order[];
  failed: { designId: string; reason: string }[];
}

// ─── API Functions ───────────────────────────────────────────────────────────

export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return request<Order>('/orders', { method: 'POST', body: payload });
}

/** 企业主账号批量下单（月结免支付），逐条独立处理，返回每条的成功/失败结果 */
export function createBatchOrder(
  payload: BatchCreateOrderPayload,
): Promise<BatchCreateOrderResult> {
  return request<BatchCreateOrderResult>('/orders/batch', {
    method: 'POST',
    body: payload,
  });
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
