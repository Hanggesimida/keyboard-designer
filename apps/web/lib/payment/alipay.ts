import type { InitiatePaymentResult } from '@/lib/api/payments';

const MAX_POLLS = 20;
const INTERVAL_MS = 3000;

/** 将支付宝 page pay 返回的 HTML 表单写入新窗口并跳转 */
export function openAlipayPayment(formHtml: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('无法打开支付窗口，请允许浏览器弹窗后重试');
  }
  win.document.write(formHtml);
  win.document.close();
}

/** 判断 initiate 响应是否为真实支付宝支付 */
export function isRealAlipayPayment(result: InitiatePaymentResult): boolean {
  return Boolean(result.payData?.formHtml);
}

/** 轮询订单支付状态，直到 PAID 或超时 */
export function pollOrderUntilPaid(
  fetchOrder: (orderId: string) => Promise<{ status: string }>,
  orderId: string,
  options?: {
    onPaid?: () => void;
    onTimeout?: () => void;
    onError?: (error: unknown) => void;
  },
): () => void {
  let count = 0;
  const timer = setInterval(async () => {
    count += 1;
    try {
      const order = await fetchOrder(orderId);
      if (order.status === 'PAID') {
        clearInterval(timer);
        options?.onPaid?.();
      } else if (count >= MAX_POLLS) {
        clearInterval(timer);
        options?.onTimeout?.();
      }
    } catch (err) {
      clearInterval(timer);
      options?.onError?.(err);
    }
  }, INTERVAL_MS);

  return () => clearInterval(timer);
}
