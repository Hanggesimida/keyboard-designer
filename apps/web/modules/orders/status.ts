import type { LucideIcon } from "lucide-react"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import type { OrderStatus } from "@/lib/api/orders"

export interface OrderStatusDisplay {
  label: OrderStatus
  badgeCls: string
  icon: LucideIcon
  iconCls: string
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusDisplay> = {
  PENDING: {
    label: "PENDING",
    badgeCls: "text-amber-400/80 border-amber-400/25 bg-amber-400/[0.06]",
    icon: Clock,
    iconCls: "text-amber-400",
  },
  PAID: {
    label: "PAID",
    badgeCls: "text-sky-400/80 border-sky-400/25 bg-sky-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-sky-400",
  },
  APPROVED: {
    label: "APPROVED",
    badgeCls: "text-violet-400/80 border-violet-400/25 bg-violet-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-violet-400",
  },
  PROCESSING: {
    label: "PROCESSING",
    badgeCls: "text-blue-400/80 border-blue-400/25 bg-blue-400/[0.06]",
    icon: Clock,
    iconCls: "text-blue-400",
  },
  SHIPPING: {
    label: "SHIPPING",
    badgeCls: "text-orange-400/80 border-orange-400/25 bg-orange-400/[0.06]",
    icon: Clock,
    iconCls: "text-orange-400",
  },
  COMPLETED: {
    label: "COMPLETED",
    badgeCls: "text-emerald-400/80 border-emerald-400/25 bg-emerald-400/[0.06]",
    icon: CheckCircle2,
    iconCls: "text-emerald-400",
  },
  CANCELLED: {
    label: "CANCELLED",
    badgeCls: "text-white/30 border-white/10 bg-white/[0.03]",
    icon: XCircle,
    iconCls: "text-white/30",
  },
  REFUNDING: {
    label: "REFUNDING",
    badgeCls: "text-rose-400/80 border-rose-400/25 bg-rose-400/[0.06]",
    icon: Clock,
    iconCls: "text-rose-400",
  },
  REFUNDED: {
    label: "REFUNDED",
    badgeCls: "text-white/40 border-white/10 bg-white/[0.03]",
    icon: CheckCircle2,
    iconCls: "text-white/40",
  },
}
