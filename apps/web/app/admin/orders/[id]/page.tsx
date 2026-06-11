"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
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
  Activity,
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useAdminOrder, useUpdateOrderStatus } from "@/hooks/queries/admin/useAdminOrders"
import { OrderStatusBadge, ORDER_STATUS_CONFIG } from "@/modules/admin/components/OrderStatusBadge"
import { StatusActionButtons } from "@/modules/admin/components/StatusActionButtons"
import type { UpdateOrderStatusPayload } from "@/lib/api/admin-orders"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [statusError, setStatusError] = useState<string | null>(null)

  const { data: order, isLoading, error } = useAdminOrder(id)
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()

  if (isLoading) {
    return <OrderDetailSkeleton />
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Package size={36} className="text-white/20" />
        <p className="text-white/40 text-sm">订单不存在或加载失败</p>
        <button
          type="button"
          onClick={() => router.push("/admin/orders")}
          className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 cursor-pointer"
        >
          返回订单列表
        </button>
      </div>
    )
  }

  const statusCfg = ORDER_STATUS_CONFIG[order.status]

  function handleUpdateStatus(payload: UpdateOrderStatusPayload) {
    setStatusError(null)
    updateStatus(
      { id: order!.id, payload },
      {
        onError: (err) => {
          setStatusError(err instanceof Error ? err.message : "操作失败，请重试")
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

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* 返回 + 页头 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/orders")}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors group cursor-pointer mb-3"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            返回订单列表
          </button>
          <h1 className="text-lg font-bold text-white/90">订单详情</h1>
          <p className="text-xs font-mono text-white/35 mt-0.5">{order.orderNo}</p>
        </div>

        {/* 导出操作 */}
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            icon={ExternalLink}
            label="在设计器中打开"
            onClick={() => window.open(`/design?id=${order.design.id}`, "_blank")}
          />
          <ExportButton
            icon={FileJson}
            label="导出 JSON"
            onClick={handleExportSnapshot}
          />
          <ExportButton
            icon={ImageIcon}
            label="导出 PNG"
            onClick={() => window.open(`/design?id=${order.design.id}&autoExport=png`, "_blank")}
          />
          <ExportButton
            icon={FileCode2}
            label="导出 SVG"
            onClick={() => window.open(`/design?id=${order.design.id}&autoExport=svg`, "_blank")}
          />
          <ExportButton
            icon={Wrench}
            label="治具 SVG"
            onClick={() => window.open(`/design?id=${order.design.id}&autoExport=jig`, "_blank")}
          />
        </div>
      </div>

      {/* 状态 + 操作 */}
      <Section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <OrderStatusBadge status={order.status} size="md" />
              <span className="text-sm text-white/50">{statusCfg.label}</span>
            </div>
            <p className="text-xs text-white/30">
              下单时间：{format(new Date(order.createdAt), "yyyy年M月d日 HH:mm", { locale: zhCN })}
            </p>
            {order.paidAt && (
              <p className="text-xs text-white/30 mt-0.5">
                支付时间：{format(new Date(order.paidAt), "yyyy年M月d日 HH:mm", { locale: zhCN })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
            <StatusActionButtons
              orderId={order.id}
              currentStatus={order.status}
              isPending={isUpdating}
              onUpdate={handleUpdateStatus}
            />
            {statusError && (
              <p className="text-xs text-red-400/80">{statusError}</p>
            )}
          </div>
        </div>
      </Section>

      {/* 用户信息 */}
      <Section>
        <SectionTitle icon={<User size={14} />} text="用户信息" />
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 space-y-2">
          <InfoRow label="用户 ID" value={order.user.id} mono />
          <InfoRow label="邮箱" value={order.user.email} />
        </div>
      </Section>

      {/* 设计商品 */}
      <Section>
        <SectionTitle icon={<Keyboard size={14} />} text="商品信息" />
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
          <div className="w-20 h-14 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center overflow-hidden shrink-0">
            {order.design.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.design.previewUrl}
                alt={order.design.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Keyboard size={18} className="text-white/20" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">{order.design.name}</p>
            <p className="mt-0.5 text-xs text-white/35 font-mono">{order.design.id}</p>
            {order.note && (
              <p className="mt-1 text-xs text-white/30">备注：{order.note}</p>
            )}
          </div>
          <p className="text-sm font-semibold text-white/80 shrink-0 hidden sm:block">
            ¥{parseFloat(order.totalAmount).toFixed(2)}
          </p>
        </div>
      </Section>

      {/* 收货地址 */}
      <Section>
        <SectionTitle icon={<MapPin size={14} />} text="收货地址" />
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white/80">
              {order.addressSnapshot.name}
            </span>
            <span className="text-sm text-white/40">
              {order.addressSnapshot.phone}
            </span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            {order.addressSnapshot.province}
            {order.addressSnapshot.city}
            {order.addressSnapshot.district}{" "}
            {order.addressSnapshot.detail}
          </p>
        </div>
      </Section>

      {/* 支付信息 */}
      {order.payment && (
        <Section>
          <SectionTitle icon={<CreditCard size={14} />} text="支付信息" />
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 space-y-2">
            <InfoRow
              label="支付方式"
              value={order.payment.method === "ALIPAY" ? "支付宝" : "微信支付"}
            />
            <InfoRow
              label="支付状态"
              value={
                order.payment.status === "PAID"
                  ? "已支付"
                  : order.payment.status === "FAILED"
                    ? "支付失败"
                    : "未支付"
              }
            />
            <InfoRow
              label="支付金额"
              value={`¥${parseFloat(order.payment.amount).toFixed(2)}`}
            />
            {order.payment.paidAt && (
              <InfoRow
                label="支付时间"
                value={format(
                  new Date(order.payment.paidAt),
                  "yyyy年M月d日 HH:mm:ss",
                  { locale: zhCN },
                )}
              />
            )}
            {order.payment.thirdPartyId && (
              <InfoRow label="第三方流水号" value={order.payment.thirdPartyId} mono />
            )}
          </div>
        </Section>
      )}

      {/* 订单摘要 */}
      <Section>
        <SectionTitle icon={<Package size={14} />} text="订单摘要" />
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 space-y-2">
          <InfoRow label="订单号" value={order.orderNo} mono />
          <InfoRow
            label="下单时间"
            value={format(
              new Date(order.createdAt),
              "yyyy年M月d日 HH:mm:ss",
              { locale: zhCN },
            )}
          />
          <InfoRow
            label="最后更新"
            value={format(
              new Date(order.updatedAt),
              "yyyy年M月d日 HH:mm:ss",
              { locale: zhCN },
            )}
          />
          <div className="pt-1 border-t border-white/[0.06]">
            <InfoRow
              label="订单总额"
              value={`¥${parseFloat(order.totalAmount).toFixed(2)}`}
              highlight
            />
          </div>
        </div>
      </Section>
    </div>
  )
}

// ─── 子组件 ───────────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 sm:p-5">
      {children}
    </div>
  )
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-white/35">{icon}</span>
      <h3 className="text-sm font-semibold text-white/60">{text}</h3>
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
      <span className="text-xs text-white/35 shrink-0">{label}</span>
      <span
        className={[
          "text-xs text-right truncate",
          mono ? "font-mono" : "",
          highlight ? "text-white/80 font-semibold" : "text-white/55",
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
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-colors cursor-pointer"
    >
      <Icon size={14} />
    </button>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="h-20 rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse" />
      {[120, 90, 100, 80].map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
        />
      ))}
    </div>
  )
}
