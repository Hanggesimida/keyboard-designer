"use client"

import Link from "next/link"
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  TrendingUp,
  ArrowRight,
  RefreshCcw,
  Bell,
  XCircle,
  RefreshCw,
  CheckCheck,
  type LucideIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useAdminOrders } from "@/hooks/queries/admin/useAdminOrders"
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/queries/admin/useAdminNotifications"
import { OrderStatusBadge } from "@/modules/orders"
import { useNotificationStore } from "@/store/notificationStore"
import type { OrderStatus } from "@/lib/api/orders"
import type { NotificationType } from "@/lib/api/notifications"
import { PageHeader } from "@/components/layouts/PageHeader"

// ─── 统计卡片 ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconCls: string
  href?: string
}

function StatCard({ label, value, icon: Icon, iconCls, href }: StatCardProps) {
  const inner = (
    <div className="relative flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/35 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{label}</p>
      </div>
      {href && (
        <ArrowRight
          size={13}
          className="absolute top-4 right-4 text-muted-foreground/35 group-hover:text-muted-foreground/70 transition-colors"
        />
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block">
        {inner}
      </Link>
    )
  }
  return inner
}

// ─── 通知类型图标映射 ─────────────────────────────────────────────────────────

const NOTIFICATION_ICON: Record<NotificationType, { icon: LucideIcon; cls: string }> = {
  ORDER_PAID: { icon: ShoppingBag, cls: "text-sky-400" },
  ORDER_CANCELLED: { icon: XCircle, cls: "text-muted-foreground/70" },
  ORDER_REFUND_REQUEST: { icon: RefreshCw, cls: "text-rose-400" },
}

// ─── 概览通知列表 ─────────────────────────────────────────────────────────────

function NotificationWidget() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead } = useMarkAllNotificationsRead()

  // 最近 5 条（优先未读）
  const recent = [...notifications]
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, 5)

  return (
    <div className="rounded-xl border border-border overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">最新通知</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500/80 text-white text-[9px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1 text-[11px] text-violet-400/60 hover:text-violet-400 transition-colors cursor-pointer"
          >
            <CheckCheck size={12} />
            全部已读
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Bell size={18} className="text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground/35">暂无通知</p>
        </div>
      ) : (
        <div>
          {recent.map((n) => {
            const { icon: Icon, cls } = NOTIFICATION_ICON[n.type] ?? NOTIFICATION_ICON.ORDER_PAID
            const orderId = n.data?.orderId as string | undefined
            const inner = (
              <div
                key={n.id}
                className={[
                  "flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 transition-colors",
                  !n.isRead ? "cursor-pointer hover:bg-muted/30" : "opacity-50",
                ].join(" ")}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className={`mt-0.5 shrink-0 ${cls}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground/75 truncate">{n.title}</p>
                    {!n.isRead && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate">{n.body}</p>
                </div>
                <p className="text-[10px] text-muted-foreground/35 shrink-0 pt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}
                </p>
              </div>
            )

            return orderId ? (
              <Link key={n.id} href={`/admin/orders/${orderId}`}>
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 待处理状态列表 ────────────────────────────────────────────────────────────

const ATTENTION_STATUSES: { status: OrderStatus; label: string; color: string }[] = [
  { status: "PAID", label: "待接单", color: "bg-sky-400" },
  { status: "REFUNDING", label: "退款中", color: "bg-rose-400" },
  { status: "APPROVED", label: "已接单", color: "bg-violet-400" },
  { status: "PROCESSING", label: "生产中", color: "bg-blue-400" },
  { status: "SHIPPING", label: "运输中", color: "bg-orange-400" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  // 拉取各关键状态数量
  const { data: allData, isLoading: allLoading } = useAdminOrders({ limit: 1 })
  const { data: paidData } = useAdminOrders({ status: ["PAID"], limit: 1 })
  const { data: approvedData } = useAdminOrders({ status: ["APPROVED"], limit: 1 })
  const { data: processingData } = useAdminOrders({ status: ["PROCESSING"], limit: 1 })
  const { data: shippingData } = useAdminOrders({ status: ["SHIPPING"], limit: 1 })
  const { data: completedData } = useAdminOrders({ status: ["COMPLETED"], limit: 1 })
  const { data: refundingData } = useAdminOrders({ status: ["REFUNDING"], limit: 1 })

  // 最近 5 条订单
  const { data: recentData, isLoading: recentLoading } = useAdminOrders({ limit: 5, page: 1 })

  const total = allData?.total ?? 0
  const paidCount = paidData?.total ?? 0
  const approvedCount = approvedData?.total ?? 0
  const processingCount = processingData?.total ?? 0
  const shippingCount = shippingData?.total ?? 0
  const completedCount = completedData?.total ?? 0
  const refundingCount = refundingData?.total ?? 0

  const needsAttentionCount = paidCount + refundingCount

  return (
    <div>
      <PageHeader title="概览" description="后台数据一览，快速了解当前业务状态。" />

      {/* 通知列表 */}
      <NotificationWidget />

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="订单总数"
          value={allLoading ? "—" : total}
          icon={ShoppingBag}
          iconCls="bg-muted/50 text-muted-foreground"
          href="/admin/orders"
        />
        <StatCard
          label="待接单"
          value={allLoading ? "—" : paidCount}
          icon={Clock}
          iconCls="bg-sky-400/10 text-sky-400/70"
          href="/admin/orders"
        />
        <StatCard
          label="运输中"
          value={allLoading ? "—" : shippingCount}
          icon={Truck}
          iconCls="bg-orange-400/10 text-orange-400/70"
          href="/admin/orders"
        />
        <StatCard
          label="已完成"
          value={allLoading ? "—" : completedCount}
          icon={CheckCircle2}
          iconCls="bg-emerald-400/10 text-emerald-400/70"
          href="/admin/orders"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 最近订单 */}
        <div className="lg:col-span-3 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">最近订单</span>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/55 hover:text-muted-foreground transition-colors"
            >
              全部 <ArrowRight size={11} />
            </Link>
          </div>

          {recentLoading ? (
            <div className="overflow-x-auto">
              <div className="min-w-[480px] space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 animate-pulse"
                  >
                    <div className="h-3 w-32 rounded bg-muted/50" />
                    <div className="flex-1 h-3 rounded bg-muted/40" />
                    <div className="h-4 w-12 rounded bg-muted/50" />
                    <div className="h-3 w-16 rounded bg-muted/40" />
                  </div>
                ))}
              </div>
            </div>
          ) : (recentData?.items ?? []).length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground/45">暂无订单</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {(recentData?.items ?? []).map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors group"
                  >
                    <p className="text-xs font-mono text-muted-foreground w-36 shrink-0 truncate">
                      {order.orderNo}
                    </p>
                    <p className="flex-1 text-sm text-foreground/70 truncate min-w-0">
                      {order.design.name}
                    </p>
                    <OrderStatusBadge status={order.status} />
                    <p className="text-xs text-muted-foreground/45 shrink-0 w-20 text-right">
                      {formatDistanceToNow(new Date(order.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：状态分布 */}
        <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">状态分布</span>
          </div>
          <div className="p-4 space-y-3">
            {ATTENTION_STATUSES.map(({ status, label, color }) => {
              const counts: Record<string, number> = {
                PAID: paidCount,
                REFUNDING: refundingCount,
                APPROVED: approvedCount,
                PROCESSING: processingCount,
                SHIPPING: shippingCount,
              }
              const count = counts[status] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0

              return (
                <Link
                  key={status}
                  href="/admin/orders"
                  className="flex items-center gap-3 group"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${color} opacity-70`} />
                  <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} opacity-40 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground/70 w-6 text-right shrink-0">
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* 需要关注 */}
          {needsAttentionCount > 0 && (
            <div className="mx-4 mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <RefreshCcw size={12} className="text-amber-400/70 shrink-0" />
                <p className="text-xs text-amber-400/70">
                  有 <span className="font-semibold">{needsAttentionCount}</span> 笔订单需要处理
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-400/50 hover:text-amber-400/80 transition-colors"
              >
                立即处理 <ArrowRight size={10} />
              </Link>
            </div>
          )}

          {/* 生产统计 */}
          <div className="border-t border-border/60 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/55">
              <TrendingUp size={12} />
              <span>
                生产中 <span className="text-muted-foreground font-medium tabular-nums">{processingCount}</span> 笔
                · 运输 <span className="text-muted-foreground font-medium tabular-nums">{shippingCount}</span> 笔
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
