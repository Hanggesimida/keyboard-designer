import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { DesignStatus } from "@/lib/api/designs"

const DESIGN_STATUS_CONFIG: Record<DesignStatus, { label: string; badgeCls: string }> = {
  DRAFT: { label: "草稿", badgeCls: "border-border text-muted-foreground" },
  SUBMITTED: { label: "已提交", badgeCls: "border-amber-400/30 text-amber-500" },
  ORDERED: { label: "已下单", badgeCls: "border-emerald-400/30 text-emerald-500" },
}

interface DesignStatusBadgeProps {
  status: DesignStatus
}

export function DesignStatusBadge({ status }: DesignStatusBadgeProps) {
  const cfg = DESIGN_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn("h-auto px-1.5 py-0.5 text-[11px]", cfg.badgeCls)}>
      {cfg.label}
    </Badge>
  )
}
