"use client"

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getOrder } from '@/lib/api/orders';
import { initiatePayment, type PaymentMethod } from '@/lib/api/payments';
import { resolveErrorMessage } from '@/lib/api/request';
import {
  isRealAlipayPayment,
  openAlipayPayment,
  pollOrderUntilPaid,
} from '@/lib/payment/alipay';
import { useMockCallback } from '@/hooks/queries/payments/usePayments';
import { useRouter } from '@/i18n/navigation';

interface PayOrderOptions {
  orderId: string;
  method?: PaymentMethod;
  onError?: (message: string) => void;
  /** 支付完成后的跳转路径，默认订单详情 */
  redirectTo?: string;
}

/** 发起支付：真实支付宝跳转或开发环境 mock */
export function usePayOrder() {
  const router = useRouter();
  const tErrors = useTranslations('Errors');
  const { mutate: mockCallback } = useMockCallback();

  const payOrder = useCallback(
    ({ orderId, method = 'ALIPAY', onError, redirectTo }: PayOrderOptions) => {
      initiatePayment({ orderId, method })
        .then((payment) => {
          const target = redirectTo ?? `/profile/orders/${orderId}`;

          if (isRealAlipayPayment(payment)) {
            try {
              openAlipayPayment(payment.payData!.formHtml!);
            } catch {
              onError?.(tErrors('alipayWindow'));
              return;
            }

            pollOrderUntilPaid(getOrder, orderId, {
              onPaid: () => router.push(target),
              onTimeout: () =>
                onError?.(tErrors('paymentProcessing')),
              onError: () =>
                onError?.(tErrors('paymentQueryFailed')),
            });
            return;
          }

          mockCallback(payment.paymentId, {
            onSuccess: () => router.push(target),
            onError: (err) =>
              onError?.(
                resolveErrorMessage(
                  err,
                  tErrors('paymentCallbackFailed'),
                  tErrors('sessionExpired'),
                ),
              ),
          });
        })
        .catch((err) => {
          onError?.(
            resolveErrorMessage(
              err,
              tErrors('paymentStartFailed'),
              tErrors('sessionExpired'),
            ),
          );
        });
    },
    [mockCallback, router, tErrors],
  );

  return { payOrder };
}
