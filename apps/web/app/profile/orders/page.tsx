"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingBag, ChevronRight, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ProfileLayout, ProfileSection, ProfileEmptyState } from "@/modules/profile"
import { useMyOrders, useCancelOrder } from "@/hooks/queries/orders/useOrders"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import type { OrderStatus } from "@/lib/api/orders"

// ─── 状态标签 ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: {
    label: "待支付",
    cls: "text-amber-400/80 border-amber-400/25 bg-amber-400/[0.06]",
  },
  PAID: {
    label: "已支付",
    cls: "text-emerald-400/80 border-emerald-400/25 bg-emerald-400/[0.06]",
  },
  CANCELLED: {
    label: "已取消",
    cls: "text-white/30 border-white/10 bg-white/[0.03]",
  },
  REFUNDING: {
    label: "退款中",
    cls: "text-sky-400/80 border-sky-400/25 bg-sky-400/[0.06]",
  },
  REFUNDED: {
    label: "已退款",
    cls: "text-white/40 border-white/10 bg-white/[0.03]",
  },
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span
      className={`inline-flex text-[11px] font-medium border rounded px-1.5 py-0.5 ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── 状态筛选 ─────────────────────────────────────────────────────────────────

const STATUS_TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "已支付" },
  { value: "CANCELLED", label: "已取消" },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfileOrdersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const { data, isLoading } = useMyOrders({ status: statusFilter, limit: 20 })
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder()

  const orders = data?.items ?? []

  function handleConfirmCancel() {
    if (!cancelTargetId) return
    setCancelError(null)
    cancelOrder(cancelTargetId, {
      onSuccess: () => setCancelTargetId(null),
      onError: () => setCancelError("取消失败，请稍后重试"),
    })
  }

  return (
    <ProfileLayout title="我的订单" description="查看你的所有键盘定制订单。">
      <ProfileSection>
        {/* 状态筛选 Tab */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={String(tab.value)}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-white/[0.08] text-white/80"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <OrderListSkeleton />
        ) : orders.length === 0 ? (
          <ProfileEmptyState
            icon={ShoppingBag}
            title="暂无订单"
            description="前往设计器，创建并下单你的第一个键盘方案。"
            action={{ label: "开始设计", href: "/design" }}
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
              >
                {/* 订单头部 */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30 font-mono">{order.orderNo}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <span className="text-[11px] text-white/25">
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>

                {/* 订单内容 */}
                <div className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">
                      {order.design.name}
                    </p>
                    <p className="mt-0.5 text-xs text-white/35">
                      {order.addressSnapshot.name} · {order.addressSnapshot.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-semibold text-white/80">
                      ¥{parseFloat(order.totalAmount).toFixed(2)}
                    </p>

                    {/* 操作 */}
                    <div className="flex items-center gap-2">
                      {order.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => setCancelTargetId(order.id)}
                          className="text-[11px] text-white/30 hover:text-red-400/70 transition-colors cursor-pointer"
                        >
                          取消
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/profile/orders/${order.id}`)}
                        className="flex items-center gap-0.5 text-[11px] text-white/35 hover:text-white/70 transition-colors cursor-pointer"
                      >
                        详情
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      {/* 取消确认弹窗 */}
      <AlertDialog
        open={!!cancelTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTargetId(null)
            setCancelError(null)
          }
        }}
      >
        <AlertDialogContent className="bg-[#1a1a1a] border border-white/[0.1] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消订单？</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              取消后订单将无法恢复，若需要再次购买请重新下单。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && (
            <p className="text-xs text-red-400/80 px-1">{cancelError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/5">
              返回
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isCancelling ? (
                <><Loader2 size={13} className="animate-spin" /> 取消中...</>
              ) : (
                "确认取消"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileLayout>
  )
}

function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02]"
        >
          <div className="h-9 border-b border-white/[0.05] animate-pulse bg-white/[0.015]" />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/2 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
