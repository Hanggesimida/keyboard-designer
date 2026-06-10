import { request } from './request';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PaymentMethod = 'ALIPAY' | 'WECHAT';

export interface InitiatePaymentPayload {
  orderId: string;
  method: PaymentMethod;
}

export interface InitiatePaymentResult {
  paymentId: string;
  method: PaymentMethod;
  mockPayUrl?: string;
  tip?: string;
}

export interface MockCallbackResult {
  success: boolean;
  payment: {
    id: string;
    orderId: string;
    status: 'PAID';
    paidAt: string;
  };
}

// ─── API Functions ───────────────────────────────────────────────────────────

export function initiatePayment(payload: InitiatePaymentPayload): Promise<InitiatePaymentResult> {
  return request<InitiatePaymentResult>('/payments/initiate', {
    method: 'POST',
    body: payload,
  });
}

export function mockCallback(paymentId: string): Promise<MockCallbackResult> {
  return request<MockCallbackResult>('/payments/mock-callback', {
    method: 'POST',
    body: { paymentId },
  });
}
