import type { LucideIcon } from "lucide-react"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import type { OrderStatus } from "@/lib/api/orders"

export interface OrderStatusDisplay {
  label: string
  badgeCls: string
  icon: LucideIcon
  iconCls: string
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusDisplay> = {
  PENDING: {
    label: "待支付",
    badgeCls: "text-amber-400/80 border-amber-400/25 bg-amber-400/[0.06]",
    icon: Clock,
    iconCls: "text-amber-400",
  },
  PAID: {
    label: "待接单",
    badgeCls: "text-sky-400/80 border-sky-400/25 bg-sky-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-sky-400",
  },
  APPROVED: {
    label: "已接单",
    badgeCls: "text-violet-400/80 border-violet-400/25 bg-violet-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-violet-400",
  },
  PROCESSING: {
    label: "生产中",
    badgeCls: "text-blue-400/80 border-blue-400/25 bg-blue-400/[0.06]",
    icon: Clock,
    iconCls: "text-blue-400",
  },
  SHIPPING: {
    label: "运输中",
    badgeCls: "text-orange-400/80 border-orange-400/25 bg-orange-400/[0.06]",
    icon: Clock,
    iconCls: "text-orange-400",
  },
  COMPLETED: {
    label: "已完成",
    badgeCls: "text-emerald-400/80 border-emerald-400/25 bg-emerald-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-emerald-400",
  },
  CANCELLED: {
    label: "已取消",
    badgeCls: "text-white/30 border-white/10 bg-white/[0.03]",
    icon: XCircle,
    iconCls: "text-white/30",
  },
  REFUNDING: {
    label: "退款中",
    badgeCls: "text-rose-400/80 border-rose-400/25 bg-rose-400/[0.06]",
    icon: Clock,
    iconCls: "text-rose-400",
  },
  REFUNDED: {
    label: "已退款",
    badgeCls: "text-white/40 border-white/10 bg-white/[0.03]",
    icon: CheckCircle2,
    iconCls: "text-white/40",
  },
}
