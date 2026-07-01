"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"
import { useCreateOrder } from "@/hooks/queries/orders/useOrders"
import { useInitiatePayment, useMockCallback } from "@/hooks/queries/payments/usePayments"
import type { PaymentMethod } from "@/lib/api/payments"
import { ApiError } from "@/lib/api/request"

interface PaymentConfirmSectionProps {
  designId: string
  selectedAddressId: string | null
  /** 服务端报价金额，用于按钮展示，来自 useOrderQuote */
  totalAmount: number | undefined
  /** 用户未选地址时，通知父组件高亮地址区域 */
  onAddressRequired: () => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; desc: string }[] = [
  { value: "ALIPAY", label: "支付宝", desc: "安全快捷" },
  { value: "WECHAT", label: "微信支付", desc: "便捷支付" },
]

export function PaymentConfirmSection({
  designId,
  selectedAddressId,
  totalAmount,
  onAddressRequired,
}: PaymentConfirmSectionProps) {
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod>("ALIPAY")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder()
  const { mutate: initiatePayment, isPending: isInitiating } = useInitiatePayment()
  const { mutate: mockCallback, isPending: isMocking } = useMockCallback()

  const isProcessing = isCreatingOrder || isInitiating || isMocking

  async function handlePay() {
    if (!selectedAddressId) {
      onAddressRequired()
      return
    }
    setSubmitError(null)

    createOrder(
      {
        designId,
        addressId: selectedAddressId,
      },
      {
        onSuccess: (order) => {
          initiatePayment(
            { orderId: order.id, method },
            {
              onSuccess: (payment) => {
                mockCallback(payment.paymentId, {
                  onSuccess: () => {
                    router.push(`/profile/orders/${order.id}`)
                  },
                  onError: (err) => {
                    setSubmitError(
                      err instanceof ApiError ? err.message : "支付回调失败，请联系客服",
                    )
                  },
                })
              },
              onError: (err) => {
                setSubmitError(
                  err instanceof ApiError ? err.message : "发起支付失败，请重试",
                )
              },
            },
          )
        },
        onError: (err) => {
          setSubmitError(
            err instanceof ApiError ? err.message : "创建订单失败，请重试",
          )
        },
      },
    )
  }

  const priceLabel = totalAmount != null ? `¥${totalAmount.toFixed(2)}` : "..."

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground/70">支付方式</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const isSelected = method === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                disabled={isProcessing}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
                    : "border-border bg-muted/30 hover:bg-muted/40",
                )}
              >
                <span className="text-sm font-medium text-foreground/80">{m.label}</span>
                <span className="text-xs text-muted-foreground/60">{m.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        disabled={isProcessing || totalAmount == null}
        onClick={handlePay}
        className="h-11 w-full cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            {isCreatingOrder ? "创建订单..." : isInitiating ? "发起支付..." : "支付中..."}
          </>
        ) : (
          <>
            <ShieldCheck size={15} className="opacity-70" />
            立即支付 {priceLabel}
          </>
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground/55">
        点击「立即支付」即表示同意相关服务协议
        <br />
        <span className="text-amber-400/70">（当前为开发模式，支付将自动完成）</span>
      </p>
    </div>
  )
}
