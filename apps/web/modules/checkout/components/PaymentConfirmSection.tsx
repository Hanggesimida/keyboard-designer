"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
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

    // totalAmount 由服务端在 POST /orders 时自行计算，前端不再传入
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
                // 开发阶段：立即调用 mock-callback 完成支付
                mockCallback(payment.paymentId, {
                  onSuccess: () => {
                    router.push(`/profile/orders/${order.id}`)
                  },
                  onError: (err) => {
                    setSubmitError(
                      err instanceof ApiError ? err.message : "支付回调失败，请联系客服"
                    )
                  },
                })
              },
              onError: (err) => {
                setSubmitError(
                  err instanceof ApiError ? err.message : "发起支付失败，请重试"
                )
              },
            },
          )
        },
        onError: (err) => {
          setSubmitError(
            err instanceof ApiError ? err.message : "创建订单失败，请重试"
          )
        },
      },
    )
  }

  const priceLabel = totalAmount != null ? `¥${totalAmount.toFixed(2)}` : "..."

  return (
    <div className="space-y-4">
      {/* 支付方式选择 */}
      <div>
        <p className="text-xs font-medium text-white/50 mb-2">支付方式</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const isSelected = method === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                disabled={isProcessing}
                className={[
                  "flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                  isSelected
                    ? "border-white/30 bg-white/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/15",
                ].join(" ")}
              >
                <span className="text-sm font-medium text-white/80">{m.label}</span>
                <span className="text-xs text-white/35">{m.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 提交级错误 */}
      {submitError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2.5">
          <p className="text-xs text-red-400/90">{submitError}</p>
        </div>
      )}

      {/* 支付按钮 */}
      <button
        type="button"
        disabled={isProcessing || totalAmount == null}
        onClick={handlePay}
        className="w-full h-11 rounded-xl bg-white text-[#0d0d0d] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/92 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_24px_rgba(255,255,255,0.10)] cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 size={15} className="animate-spin opacity-70" />
            {isCreatingOrder ? "创建订单..." : isInitiating ? "发起支付..." : "支付中..."}
          </>
        ) : (
          <>
            <ShieldCheck size={15} className="opacity-60" />
            立即支付 {priceLabel}
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-white/20 leading-relaxed">
        点击"立即支付"即表示同意相关服务协议
        <br />
        <span className="text-amber-400/40">（当前为开发模式，支付将自动完成）</span>
      </p>
    </div>
  )
}
