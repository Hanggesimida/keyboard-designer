import { Badge } from "@workspace/ui/components/badge"
import type { OrderStatus } from "@/lib/api/orders"
import { ORDER_STATUS_CONFIG } from "../status"
import { cn } from "@workspace/ui/lib/utils"

export { ORDER_STATUS_CONFIG } from "../status"

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: "sm" | "md"
}

export function OrderStatusBadge({ status, size = "sm" }: OrderStatusBadgeProps) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.PENDING
  return (
    <Badge
      variant="outline"
      className={cn(
        size === "sm" ? "text-[11px] px-1.5 py-0.5 h-auto" : "text-xs px-2 py-1 h-auto",
        cfg.badgeCls,
      )}
    >
      {cfg.label}
    </Badge>
  )
}
