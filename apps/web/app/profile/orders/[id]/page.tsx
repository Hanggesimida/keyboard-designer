"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Keyboard,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ProfileLayout, ProfileSection } from "@/modules/profile"
import { useOrder, useCancelOrder } from "@/hooks/queries/orders/useOrders"
import type { OrderStatus } from "@/lib/api/orders"

// ─── 状态展示配置 ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ElementType; cls: string }
> = {
  PENDING: { label: "待支付", icon: Clock, cls: "text-amber-400" },
  PAID: { label: "已支付", icon: CheckCircle2, cls: "text-emerald-400" },
  CANCELLED: { label: "已取消", icon: XCircle, cls: "text-white/30" },
  REFUNDING: { label: "退款中", icon: Clock, cls: "text-sky-400" },
  REFUNDED: { label: "已退款", icon: CheckCircle2, cls: "text-white/40" },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { data: order, isLoading, error } = useOrder(id)
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder()

  if (isLoading) {
    return (
      <ProfileLayout title="订单详情">
        <OrderDetailSkeleton />
      </ProfileLayout>
    )
  }

  if (error || !order) {
    return (
      <ProfileLayout title="订单详情">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">订单不存在或加载失败</p>
          <button
            type="button"
            onClick={() => router.push("/profile/orders")}
            className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2 cursor-pointer"
          >
            返回订单列表
          </button>
        </div>
      </ProfileLayout>
    )
  }

  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = statusCfg.icon

  function handleCancel() {
    cancelOrder(id, {
      onSuccess: () => router.push("/profile/orders"),
    })
  }

  return (
    <ProfileLayout title="订单详情" description={`订单号：${order.orderNo}`}>
      <div className="max-w-[1200px] space-y-5">
        {/* 返回 */}
        <button
          type="button"
          onClick={() => router.push("/profile/orders")}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors group cursor-pointer"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          返回订单列表
        </button>

        {/* 订单状态 */}
        <ProfileSection>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon size={20} className={statusCfg.cls} />
              <div>
                <p className={`text-base font-semibold ${statusCfg.cls}`}>
                  {statusCfg.label}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  下单时间：{format(new Date(order.createdAt), "yyyy年M月d日 HH:mm", { locale: zhCN })}
                </p>
              </div>
            </div>

            {order.status === "PENDING" && (
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancel}
                className="text-xs text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCancelling ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />取消中
                  </span>
                ) : (
                  "取消订单"
                )}
              </button>
            )}
          </div>
        </ProfileSection>

        {/* 设计商品 */}
        <ProfileSection>
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
              <p className="mt-0.5 text-xs text-white/35">定制键帽 · 1 套</p>
              {order.note && (
                <p className="mt-1 text-xs text-white/30">备注：{order.note}</p>
              )}
            </div>
            <p className="text-sm font-semibold text-white/80 shrink-0">
              ¥{parseFloat(order.totalAmount).toFixed(2)}
            </p>
          </div>
        </ProfileSection>

        {/* 收货地址（快照） */}
        <ProfileSection>
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
        </ProfileSection>

        {/* 支付信息 */}
        {order.payment && (
          <ProfileSection>
            <SectionTitle icon={<CreditCard size={14} />} text="支付信息" />
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 space-y-2">
              <InfoRow label="支付方式" value={order.payment.method === "ALIPAY" ? "支付宝" : "微信支付"} />
              <InfoRow label="支付状态" value={order.payment.status === "PAID" ? "已支付" : order.payment.status === "FAILED" ? "支付失败" : "未支付"} />
              <InfoRow label="支付金额" value={`¥${parseFloat(order.payment.amount).toFixed(2)}`} />
              {order.payment.paidAt && (
                <InfoRow
                  label="支付时间"
                  value={format(new Date(order.payment.paidAt), "yyyy年M月d日 HH:mm:ss", { locale: zhCN })}
                />
              )}
            </div>
          </ProfileSection>
        )}

        {/* 订单摘要 */}
        <ProfileSection>
          <SectionTitle icon={<Package size={14} />} text="订单摘要" />
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 space-y-2">
            <InfoRow label="订单号" value={order.orderNo} mono />
            <InfoRow
              label="下单时间"
              value={format(new Date(order.createdAt), "yyyy年M月d日 HH:mm:ss", { locale: zhCN })}
            />
            <div className="pt-1 border-t border-white/[0.06]">
              <InfoRow label="订单总额" value={`¥${parseFloat(order.totalAmount).toFixed(2)}`} highlight />
            </div>
          </div>
        </ProfileSection>
      </div>
    </ProfileLayout>
  )
}

// ─── 子组件 ───────────────────────────────────────────────────────────────────

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
      <span className="text-xs text-white/35">{label}</span>
      <span
        className={[
          "text-xs",
          mono ? "font-mono" : "",
          highlight ? "text-white/80 font-semibold" : "text-white/55",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-[1200px] space-y-5">
      {[120, 90, 90, 100].map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
        />
      ))}
    </div>
  )
}
