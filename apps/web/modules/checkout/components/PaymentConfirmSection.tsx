"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2, PackageCheck, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"
import { useCreateOrder } from "@/hooks/queries/orders/useOrders"
import { usePayOrder } from "@/hooks/queries/payments/usePayOrder"
import { useUserStore } from "@/store/userStore"
import type { PaymentMethod } from "@/lib/api/payments"
import { resolveErrorMessage } from "@/lib/api/request"
import { useRouter } from "@/i18n/navigation"

interface PaymentConfirmSectionProps {
  designId: string
  selectedAddressId: string | null
  quantity: number
  /** 服务端报价金额，用于按钮展示，来自 useOrderQuote */
  totalAmount: number | undefined
  /** 用户未选地址时，通知父组件高亮地址区域 */
  onAddressRequired: () => void
}

export function PaymentConfirmSection({
  designId,
  selectedAddressId,
  quantity,
  totalAmount,
  onAddressRequired,
}: PaymentConfirmSectionProps) {
  const t = useTranslations("Checkout")
  const tErrors = useTranslations("Errors")
  const router = useRouter()
  const queryClient = useQueryClient()
  const accountType = useUserStore((s) => s.user?.accountType)
  const isEnterpriseMain = accountType === "ENTERPRISE_MAIN"

  const [method, setMethod] = useState<PaymentMethod>("ALIPAY")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [showWechatHint, setShowWechatHint] = useState(false)

  const paymentMethods: { value: PaymentMethod; label: string; desc: string }[] = [
    { value: "ALIPAY", label: t("alipay"), desc: t("alipayHint") },
    { value: "WECHAT", label: t("wechatPay"), desc: t("wechatPayHint") },
  ]

  function handleSelectMethod(value: PaymentMethod) {
    if (value === "WECHAT") {
      setShowWechatHint(true)
      window.setTimeout(() => setShowWechatHint(false), 4000)
      return
    }
    setMethod(value)
  }

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
            resolveErrorMessage(err, t("createFailed"), tErrors("sessionExpired")),
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
          {t("monthlyHint")}
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground/70">{t("payMethod")}</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((m) => {
              const isSelected = method === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleSelectMethod(m.value)}
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
          {showWechatHint && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t("wechatSoon")}
            </p>
          )}
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
            {isEnterpriseMain ? t("ordering") : isCreatingOrder ? t("creatingOrder") : t("waitingPayment")}
          </>
        ) : isEnterpriseMain ? (
          <>
            <PackageCheck size={15} className="opacity-70" />
            {t("confirmPlace")} {priceLabel}
          </>
        ) : (
          <>
            <ShieldCheck size={15} className="opacity-70" />
            {t("payNow")} {priceLabel}
          </>
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground/55">
        {isEnterpriseMain ? t("agreePlace") : t("agreePay")}
      </p>
    </div>
  )
}
