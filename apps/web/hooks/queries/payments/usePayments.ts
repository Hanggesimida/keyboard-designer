import { useMutation } from '@tanstack/react-query';
import {
  initiatePayment,
  mockCallback,
  type InitiatePaymentPayload,
} from '@/lib/api/payments';

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (payload: InitiatePaymentPayload) => initiatePayment(payload),
  });
}

export function useMockCallback() {
  return useMutation({
    mutationFn: (paymentId: string) => mockCallback(paymentId),
  });
}
