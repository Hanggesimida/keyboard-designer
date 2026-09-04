"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Keyboard,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import { format } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { ProfileSection } from "@/modules/profile"
import { PageHeader } from "@/components/layouts/PageHeader"
import { ORDER_STATUS_CONFIG } from "@/modules/orders"
import { useOrder, useCancelOrder } from "@/hooks/queries/orders/useOrders"
import { usePayOrder } from "@/hooks/queries/payments/usePayOrder"
import { pollOrderUntilPaid } from "@/lib/payment/alipay"
import { getOrder } from "@/lib/api/orders"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { useRouter } from "@/i18n/navigation"

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const t = useTranslations("Profile.orders")
  const tStatus = useTranslations("OrderStatus")
  const tPay = useTranslations("PaymentMethod")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const dateFmt = locale === "zh" ? "yyyy年M月d日 HH:mm" : "MMM d, yyyy HH:mm"
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromAlipay = searchParams.get("from") === "alipay"

  const { data: order, isLoading, error, refetch } = useOrder(id)
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder()
  const { payOrder } = usePayOrder()
  const [payError, setPayError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [isPollingPayment, setIsPollingPayment] = useState(fromAlipay)

  useEffect(() => {
    if (!fromAlipay || !id) return

    const stop = pollOrderUntilPaid(getOrder, id, {
      onPaid: () => {
        setIsPollingPayment(false)
        refetch()
        router.replace(`/profile/orders/${id}`)
      },
      onTimeout: () => setIsPollingPayment(false),
      onError: () => setIsPollingPayment(false),
    })

    return stop
  }, [fromAlipay, id, refetch, router])

  if (isLoading) {
    return <OrderDetailSkeleton />
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Package size={36} className="text-muted-foreground/35" />
        <p className="text-muted-foreground/70 text-sm">{t("notFound")}</p>
        <button
          type="button"
          onClick={() => router.push("/profile/orders")}
          className="text-xs text-muted-foreground/70 hover:text-foreground/70 underline underline-offset-2 cursor-pointer"
        >
          {t("backToList")}
        </button>
      </div>
    )
  }

  const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.PENDING
  const StatusIcon = statusCfg.icon

  function handleCancel() {
    cancelOrder(id, {
      onSuccess: () => router.push("/profile/orders"),
    })
  }

  function handlePay() {
    if (!order) return
    setPayError(null)
    setIsPaying(true)
    payOrder({
      orderId: id,
      method: order.payment?.method === "WECHAT" ? "WECHAT" : "ALIPAY",
      onError: (message) => {
        setPayError(message)
        setIsPaying(false)
      },
      redirectTo: `/profile/orders/${id}?from=alipay`,
    })
  }

  const payStatusLabel =
    order.payment?.status === "PAID"
      ? t("paid")
      : order.payment?.status === "REFUNDED"
        ? t("refunded")
        : order.payment?.status === "FAILED"
          ? t("payFailed")
          : t("unpaid")

  return (
    <div className="max-w-[1200px] space-y-5">
        {/* 返回 */}
        <button
          type="button"
          onClick={() => router.push("/profile/orders")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/55 hover:text-foreground/70 transition-colors group cursor-pointer"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          {t("backToList")}
        </button>

        <PageHeader title={t("detailTitle")} description={t("detailSubtitle")} />

        {(isPollingPayment || fromAlipay) && order.status === "PENDING" && (
          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {t("paymentProcessing")}
            </AlertDescription>
          </Alert>
        )}

        {payError && (
          <Alert variant="destructive">
            <AlertDescription>{payError}</AlertDescription>
          </Alert>
        )}

        {/* 订单状态 */}
        <ProfileSection>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon size={20} className={statusCfg.iconCls} />
              <div>
                <p className={`text-base font-semibold ${statusCfg.iconCls}`}>
                  {tStatus(order.status)}
                </p>
                <p className="text-xs text-muted-foreground/55 mt-0.5">
                  {t("placedAt", {
                    date: format(new Date(order.createdAt), dateFmt, { locale: dateLocale }),
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {order.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handlePay}
                    className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:border-primary/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        {t("waitingPayment")}
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} />
                        {t("pay")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleCancel}
                    className="text-xs text-destructive/70 hover:text-destructive border border-destructive/20 hover:border-destructive/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCancelling ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />{t("cancellingShort")}
                      </span>
                    ) : (
                      t("cancelOrder")
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </ProfileSection>

        {/* 设计商品 */}
        <ProfileSection>
          <SectionTitle icon={<Keyboard size={14} />} text={t("product")} />
          <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
            <div className="w-20 h-14 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
              {order.design.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.design.previewUrl}
                  alt={order.design.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Keyboard size={20} className="text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/80 truncate">{order.design.name}</p>
              <p className="text-xs text-muted-foreground/55 mt-0.5">
                {t("customKeycaps", { count: order.quantity })}
              </p>
              <p className="text-xs text-muted-foreground/55 mt-0.5 font-mono">{order.orderNo}</p>
            </div>
            <p className="ml-auto text-base font-semibold text-foreground shrink-0">
              ¥{Number(order.totalAmount).toFixed(2)}
            </p>
          </div>
        </ProfileSection>

        {/* 收货地址 */}
        <ProfileSection>
          <SectionTitle icon={<MapPin size={14} />} text={t("address")} />
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 space-y-1">
            <p className="text-sm text-foreground/80">
              {order.addressSnapshot.name}{" "}
              <span className="text-muted-foreground/60">{order.addressSnapshot.phone}</span>
            </p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              {order.addressSnapshot.province}
              {order.addressSnapshot.city}
              {order.addressSnapshot.district}
              {order.addressSnapshot.detail}
            </p>
          </div>
        </ProfileSection>

        {/* 支付信息 */}
        {order.payment && (
          <ProfileSection>
            <SectionTitle icon={<CreditCard size={14} />} text={t("payment")} />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 space-y-2">
              <InfoRow
                label={t("payMethod")}
                value={tPay(order.payment.method)}
              />
              <InfoRow
                label={t("payStatus")}
                value={payStatusLabel}
              />
              {order.paidAt && (
                <InfoRow
                  label={t("payTime")}
                  value={format(new Date(order.paidAt), dateFmt, { locale: dateLocale })}
                />
              )}
            </div>
          </ProfileSection>
        )}
    </div>
  )
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-muted-foreground/50">{icon}</span>
      <h3 className="text-xs font-medium text-muted-foreground/70">{text}</h3>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground/55">{label}</span>
      <span className="text-foreground/75">{value}</span>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-[1200px] space-y-5 animate-pulse">
      <div className="h-4 w-24 bg-muted/50 rounded" />
      <div className="h-8 w-40 bg-muted/50 rounded" />
      <div className="h-24 bg-muted/30 rounded-xl" />
      <div className="h-32 bg-muted/30 rounded-xl" />
    </div>
  )
}
