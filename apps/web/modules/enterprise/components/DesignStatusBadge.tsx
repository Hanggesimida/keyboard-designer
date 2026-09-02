"use client"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { DesignStatus } from "@/lib/api/designs"
import { useTranslations } from "next-intl"

const DESIGN_STATUS_CONFIG: Record<DesignStatus, { key: "draft" | "submitted" | "ordered"; badgeCls: string }> = {
  DRAFT: { key: "draft", badgeCls: "border-border text-muted-foreground" },
  SUBMITTED: { key: "submitted", badgeCls: "border-amber-400/30 text-amber-500" },
  ORDERED: { key: "ordered", badgeCls: "border-emerald-400/30 text-emerald-500" },
}

interface DesignStatusBadgeProps {
  status: DesignStatus
}

export function DesignStatusBadge({ status }: DesignStatusBadgeProps) {
  const t = useTranslations("Enterprise")
  const cfg = DESIGN_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn("h-auto px-1.5 py-0.5 text-[11px]", cfg.badgeCls)}>
      {t(cfg.key)}
    </Badge>
  )
}
