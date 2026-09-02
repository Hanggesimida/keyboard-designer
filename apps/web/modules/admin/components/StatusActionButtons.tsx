"use client"

import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { getAvailableTransitions, type UpdateOrderStatusPayload } from "@/lib/api/admin-orders"
import type { OrderStatus } from "@/lib/api/orders"

const ACTION_CONFIG: Partial<Record<OrderStatus, { key: "accept" | "startProduction" | "startShipping" | "complete" | "reject"; variant: "primary" | "danger" | "warning" | "default" }>> = {
  APPROVED: { key: "accept", variant: "primary" },
  PROCESSING: { key: "startProduction", variant: "primary" },
  SHIPPING: { key: "startShipping", variant: "primary" },
  COMPLETED: { key: "complete", variant: "primary" },
  CANCELLED: { key: "reject", variant: "danger" },
}

const VARIANT_CLS = {
  primary: "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.1]",
  danger: "bg-red-500/[0.1] hover:bg-red-500/[0.15] text-red-400/80 border-red-500/[0.2]",
  warning: "bg-amber-500/[0.1] hover:bg-amber-500/[0.15] text-amber-400/80 border-amber-500/[0.2]",
  default: "bg-white/[0.05] hover:bg-white/[0.08] text-white/50 border-white/[0.08]",
}

interface StatusActionButtonsProps {
  orderId: string
  currentStatus: OrderStatus
  isPending: boolean
  onUpdate: (payload: UpdateOrderStatusPayload) => void
}

export function StatusActionButtons({
  currentStatus,
  isPending,
  onUpdate,
}: StatusActionButtonsProps) {
  const t = useTranslations("Admin.actions")
  const tStatus = useTranslations("OrderStatus")
  const available = getAvailableTransitions(currentStatus)

  if (available.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto">
      {available.map((target) => {
        const action = ACTION_CONFIG[target]
        const label = action ? t(action.key) : tStatus(target)
        const variant = action?.variant ?? "default"
        const isLastOdd = available.length % 2 === 1 && target === available[available.length - 1]

        return (
          <button
            key={target}
            type="button"
            disabled={isPending}
            onClick={() => onUpdate({ status: target })}
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              isLastOdd ? "col-span-2 sm:col-span-1" : "",
              VARIANT_CLS[variant],
            ].join(" ")}
          >
            {isPending && (
              <Loader2 size={12} className="animate-spin" />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
