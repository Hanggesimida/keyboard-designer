import type { OrderStatus } from "@/lib/api/orders"

// ─── 全状态配置（含管理员新增状态） ──────────────────────────────────────────────

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: {
    label: "待支付",
    cls: "text-amber-400/80 border-amber-400/25 bg-amber-400/[0.06]",
  },
  PAID: {
    label: "待接单",
    cls: "text-sky-400/80 border-sky-400/25 bg-sky-400/[0.06]",
  },
  APPROVED: {
    label: "已接单",
    cls: "text-violet-400/80 border-violet-400/25 bg-violet-400/[0.06]",
  },
  PROCESSING: {
    label: "生产中",
    cls: "text-blue-400/80 border-blue-400/25 bg-blue-400/[0.06]",
  },
  SHIPPING: {
    label: "运输中",
    cls: "text-orange-400/80 border-orange-400/25 bg-orange-400/[0.06]",
  },
  COMPLETED: {
    label: "已完成",
    cls: "text-emerald-400/80 border-emerald-400/25 bg-emerald-400/[0.06]",
  },
  CANCELLED: {
    label: "已取消",
    cls: "text-white/30 border-white/10 bg-white/[0.03]",
  },
  REFUNDING: {
    label: "退款中",
    cls: "text-rose-400/80 border-rose-400/25 bg-rose-400/[0.06]",
  },
  REFUNDED: {
    label: "已退款",
    cls: "text-white/40 border-white/10 bg-white/[0.03]",
  },
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: "sm" | "md"
}

export function OrderStatusBadge({ status, size = "sm" }: OrderStatusBadgeProps) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.PENDING
  return (
    <span
      className={[
        "inline-flex font-medium border rounded",
        size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        cfg.cls,
      ].join(" ")}
    >
      {cfg.label}
    </span>
  )
}
