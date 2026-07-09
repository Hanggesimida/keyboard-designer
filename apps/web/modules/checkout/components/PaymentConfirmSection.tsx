"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, PackageCheck, ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"
import { useCreateOrder } from "@/hooks/queries/orders/useOrders"
import { usePayOrder } from "@/hooks/queries/payments/usePayOrder"
import { useUserStore } from "@/store/userStore"
import type { PaymentMethod } from "@/lib/api/payments"
import { ApiError } from "@/lib/api/request"

interface PaymentConfirmSectionProps {
  designId: string
  selectedAddressId: string | null
  quantity: number
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
  quantity,
  totalAmount,
  onAddressRequired,
}: PaymentConfirmSectionProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accountType = useUserStore((s) => s.user?.accountType)
  const isEnterpriseMain = accountType === "ENTERPRISE_MAIN"

  const [method, setMethod] = useState<PaymentMethod>("ALIPAY")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder()
  const { payOrder } = usePayOrder()

  const isProcessing = isCreatingOrder || isPaying

  function handleSubmit() {
    if (!selectedAddressId) {
      onAddressRequired()
      return
    }
    setSubmitError(null)

    createOrder(
      {
        designId,
        addressId: selectedAddressId,
        quantity,
      },
      {
        onSuccess: (order) => {
          if (isEnterpriseMain) {
            queryClient.invalidateQueries({ queryKey: ["enterprise", "designs"] })
            router.push(`/profile/orders/${order.id}`)
            return
          }

          setIsPaying(true)
          payOrder({
            orderId: order.id,
            method,
            onError: (message) => {
              setSubmitError(message)
              setIsPaying(false)
            },
            redirectTo: `/profile/orders/${order.id}`,
          })
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
      {isEnterpriseMain ? (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground/70">
          企业主账号采用月结方式，确认后将直接生成订单，无需在线支付。
        </p>
      ) : (
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
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        disabled={isProcessing || totalAmount == null}
        onClick={handleSubmit}
        className="h-11 w-full cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            {isEnterpriseMain ? "下单中..." : isCreatingOrder ? "创建订单..." : "等待支付中..."}
          </>
        ) : isEnterpriseMain ? (
          <>
            <PackageCheck size={15} className="opacity-70" />
            确认下单 {priceLabel}
          </>
        ) : (
          <>
            <ShieldCheck size={15} className="opacity-70" />
            立即支付 {priceLabel}
          </>
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground/55">
        {isEnterpriseMain
          ? "点击「确认下单」即表示同意相关服务协议"
          : "点击「立即支付」即表示同意相关服务协议"}
      </p>
    </div>
  )
}
