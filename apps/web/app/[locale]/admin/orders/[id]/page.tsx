"use client"

import { use, useState } from "react"
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Keyboard,
  ExternalLink,
  FileJson,
  ImageIcon,
  FileCode2,
  Wrench,
  User,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react"
import { format } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/queries/admin/useAdminOrders"
import { OrderStatusBadge } from "@/modules/orders"
import { StatusActionButtons } from "@/modules/admin/components/StatusActionButtons"
import { RefundActionButton } from "@/modules/admin/components/RefundActionButton"
import type { UpdateOrderStatusPayload } from "@/lib/api/admin-orders"
import { resolveErrorMessage } from "@/lib/api/request"
import { useRouter } from "@/i18n/navigation"

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const t = useTranslations("Admin.orders")
  const tStatus = useTranslations("OrderStatus")
  const tPay = useTranslations("PaymentMethod")
  const tErrors = useTranslations("Errors")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const dateFmt = locale === "zh" ? "yyyy年M月d日 HH:mm" : "MMM d, yyyy HH:mm"
  const dateTimeFmt = locale === "zh" ? "yyyy年M月d日 HH:mm:ss" : "MMM d, yyyy HH:mm:ss"
  const router = useRouter()
  const [statusError, setStatusError] = useState<string | null>(null)

  const { data: order, isLoading, error } = useAdminOrder(id)
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()
  const [addressCopied, setAddressCopied] = useState(false)

  function handleCopyAddress() {
    if (!order) return
    const { name, phone, province, city, district, detail } = order.addressSnapshot
    const text = `${name}${phone}${province}${city}${district}${detail}`
    navigator.clipboard.writeText(text).then(() => {
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2000)
    })
  }

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
          onClick={() => router.push("/admin/orders")}
          className="text-xs text-muted-foreground/70 hover:text-foreground/70 underline underline-offset-2 cursor-pointer"
        >
          {t("backToList")}
        </button>
      </div>
    )
  }

  function handleUpdateStatus(payload: UpdateOrderStatusPayload) {
    setStatusError(null)
    updateStatus(
      { id: order!.id, payload },
      {
        onError: (err) => {
          setStatusError(resolveErrorMessage(err, t("actionFailed"), tErrors("sessionExpired")))
        },
      },
    )
  }

  function handleExportSnapshot() {
    const blob = new Blob(
      [JSON.stringify(order!.designSnapshot ?? {}, null, 2)],
      { type: "application/json" },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `keyboard-${order!.design.id}-snapshot.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const payStatusLabel =
    order.payment?.status === "PAID"
      ? t("paid")
      : order.payment?.status === "FAILED"
        ? t("payFailed")
        : t("unpaid")

  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/orders")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/55 hover:text-foreground/70 transition-colors group cursor-pointer mb-3"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            {t("backToList")}
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("detail")}</h1>
          <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">{order.orderNo}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            icon={ExternalLink}
            label={t("openInEditor")}
            onClick={() => window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin`, "_blank")}
          />
          <ExportButton
            icon={FileJson}
            label={t("exportJson")}
            onClick={handleExportSnapshot}
          />
          <ExportButton
            icon={ImageIcon}
            label={t("exportPng")}
            onClick={() => window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin&autoExport=png`, "_blank")}
          />
          <ExportButton
            icon={FileCode2}
            label={t("exportSvg")}
            onClick={() => window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin&autoExport=svg`, "_blank")}
          />
          <ExportButton
            icon={Wrench}
            label={t("jigSvg")}
            onClick={() => window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin&autoExport=jig`, "_blank")}
          />
        </div>
      </div>

      <Section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <OrderStatusBadge status={order.status} size="md" />
            <span className="text-sm text-muted-foreground">{tStatus(order.status)}</span>
          </div>
          <p className="text-xs text-muted-foreground/55">
            {t("placedAt", {
              date: format(new Date(order.createdAt), dateFmt, { locale: dateLocale }),
            })}
          </p>
            {order.paidAt && (
              <p className="text-xs text-muted-foreground/55 mt-0.5">
                {t("paidAt", {
                  date: format(new Date(order.paidAt), dateFmt, { locale: dateLocale }),
                })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:justify-end">
              <StatusActionButtons
                orderId={order.id}
                currentStatus={order.status}
                isPending={isUpdating}
                onUpdate={handleUpdateStatus}
              />
              <RefundActionButton order={order} onError={setStatusError} />
            </div>
            {statusError && (
              <p className="text-xs text-destructive/80">{statusError}</p>
            )}
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle icon={<User size={14} />} text={t("user")} />
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 space-y-2">
          <InfoRow label={t("userId")} value={order.user.id} mono />
          <InfoRow label={t("email")} value={order.user.email} />
        </div>
      </Section>

      <Section>
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
              <Keyboard size={18} className="text-muted-foreground/35" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/80 truncate">{order.design.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              {t("customKeycaps", { count: order.quantity })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60 font-mono">{order.design.id}</p>
            {order.note && (
              <p className="mt-1 text-xs text-muted-foreground/55">{t("note")}{order.note}</p>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground/80 shrink-0 hidden sm:block">
            ¥{parseFloat(order.totalAmount).toFixed(2)}
          </p>
        </div>
      </Section>

      <Section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={<MapPin size={14} />} text={t("address")} noMargin />
          <button
            type="button"
            onClick={handleCopyAddress}
            title={t("copyAddress")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted/50 transition-colors cursor-pointer text-xs"
          >
            {addressCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{addressCopied ? t("copied") : t("copyAddress")}</span>
          </button>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground/80">
              {order.addressSnapshot.name}
            </span>
            <span className="text-sm text-muted-foreground/70">
              {order.addressSnapshot.phone}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            {order.addressSnapshot.province}
            {order.addressSnapshot.city}
            {order.addressSnapshot.district}{" "}
            {order.addressSnapshot.detail}
          </p>
        </div>
      </Section>

      {order.payment && (
        <Section>
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
            <InfoRow
              label={t("amount")}
              value={`¥${parseFloat(order.payment.amount).toFixed(2)}`}
            />
            {order.payment.paidAt && (
              <InfoRow
                label={t("time")}
                value={format(
                  new Date(order.payment.paidAt),
                  dateTimeFmt,
                  { locale: dateLocale },
                )}
              />
            )}
            {order.payment.thirdPartyId && (
              <InfoRow label={t("txnId")} value={order.payment.thirdPartyId} mono />
            )}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle icon={<Package size={14} />} text={t("summary")} />
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 space-y-2">
          <InfoRow label={t("orderNo")} value={order.orderNo} mono />
          <InfoRow
            label={t("placedTime")}
            value={format(
              new Date(order.createdAt),
              dateTimeFmt,
              { locale: dateLocale },
            )}
          />
          <InfoRow
            label={t("updatedTime")}
            value={format(
              new Date(order.updatedAt),
              dateTimeFmt,
              { locale: dateLocale },
            )}
          />
          <div className="pt-1 border-t border-border/60">
            <InfoRow
              label={t("total")}
              value={`¥${parseFloat(order.totalAmount).toFixed(2)}`}
              highlight
            />
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
      {children}
    </div>
  )
}

function SectionTitle({ icon, text, noMargin }: { icon: React.ReactNode; text: string; noMargin?: boolean }) {
  return (
    <div className={["flex items-center gap-2", noMargin ? "" : "mb-3"].join(" ")}>
      <span className="text-muted-foreground/60">{icon}</span>
      <h3 className="text-sm font-semibold text-muted-foreground">{text}</h3>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground/60 shrink-0">{label}</span>
      <span
        className={[
          "text-xs text-right truncate",
          mono ? "font-mono" : "",
          highlight ? "text-foreground/80 font-semibold" : "text-muted-foreground",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

function ExportButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground/60 hover:text-foreground/70 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <Icon size={14} />
    </button>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
      {[120, 90, 100, 80].map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="rounded-xl border border-border bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  )
}
