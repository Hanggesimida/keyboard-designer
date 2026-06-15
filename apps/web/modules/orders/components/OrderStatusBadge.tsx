import type { OrderStatus } from "@/lib/api/orders"
import { ORDER_STATUS_CONFIG } from "../status"

export { ORDER_STATUS_CONFIG } from "../status"

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
        cfg.badgeCls,
      ].join(" ")}
    >
      {cfg.label}
    </span>
  )
}
