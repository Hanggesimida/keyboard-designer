import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getOrder } from '@/lib/api/orders';
import { initiatePayment, type PaymentMethod } from '@/lib/api/payments';
import { ApiError } from '@/lib/api/request';
import {
  isRealAlipayPayment,
  openAlipayPayment,
  pollOrderUntilPaid,
} from '@/lib/payment/alipay';
import { useMockCallback } from '@/hooks/queries/payments/usePayments';

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
  const { mutate: mockCallback } = useMockCallback();

  const payOrder = useCallback(
    ({ orderId, method = 'ALIPAY', onError, redirectTo }: PayOrderOptions) => {
      initiatePayment({ orderId, method })
        .then((payment) => {
          const target = redirectTo ?? `/profile/orders/${orderId}`;

          if (isRealAlipayPayment(payment)) {
            try {
              openAlipayPayment(payment.payData!.formHtml!);
            } catch (err) {
              onError?.(
                err instanceof Error ? err.message : '无法打开支付宝支付窗口',
              );
              return;
            }

            pollOrderUntilPaid(getOrder, orderId, {
              onPaid: () => router.push(target),
              onTimeout: () =>
                onError?.('支付处理中，请在订单详情查看支付状态'),
              onError: () =>
                onError?.('查询支付状态失败，请在订单详情查看'),
            });
            return;
          }

          mockCallback(payment.paymentId, {
            onSuccess: () => router.push(target),
            onError: (err) =>
              onError?.(
                err instanceof ApiError ? err.message : '支付回调失败，请联系客服',
              ),
          });
        })
        .catch((err) => {
          onError?.(
            err instanceof ApiError ? err.message : '发起支付失败，请重试',
          );
        });
    },
    [mockCallback, router],
  );

  return { payOrder };
}
