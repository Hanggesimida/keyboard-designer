import { request } from './request';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PriceBreakdownItem {
  label: string;
  amount: number;
}

export interface PriceQuote {
  totalAmount: number;
  quantity: number;
  unitPrice: number;
  breakdown: PriceBreakdownItem[];
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * 向服务端请求报价，用于结账页展示价格。
 * 不产生任何订单记录，仅用于展示。
 */
export function getOrderQuote(
  designId: string,
  quantity?: number,
): Promise<PriceQuote> {
  return request<PriceQuote>('/pricing/quote', {
    params: { designId, ...(quantity != null && { quantity }) },
  });
}
