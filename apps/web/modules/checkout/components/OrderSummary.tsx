"use client"

import { Keyboard } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Card,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import type { DesignSummary } from "@/lib/api/designs"
import type { PriceBreakdownItem } from "@/lib/api/pricing"

type OrderSummaryMode = "compact" | "pricing" | "full"

interface OrderSummaryProps {
  design: DesignSummary
  quantity: number
  totalAmount: number | undefined
  breakdown: PriceBreakdownItem[] | undefined
  isLoading?: boolean
  mode?: OrderSummaryMode
  className?: string
}

export function OrderSummary({
  design,
  quantity,
  totalAmount,
  breakdown,
  isLoading,
  mode = "full",
  className,
}: OrderSummaryProps) {
  const t = useTranslations("Checkout")
  const showProduct = mode === "compact" || mode === "full"
  const showPricing = mode === "pricing" || mode === "full"

  if (mode === "pricing") {
    return (
      <div className={cn("space-y-3", className)}>
        <PricingBreakdown
          breakdown={breakdown}
          totalAmount={totalAmount}
          isLoading={isLoading}
        />
      </div>
    )
  }

  return (
    <Card className={cn("py-0 ring-border/50", className)}>
      {showProduct && (
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
            {design.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={design.previewUrl}
                alt={design.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Keyboard size={20} className="text-muted-foreground/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground/85">{design.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              {t("customKeycaps", { count: quantity })}
            </p>
          </div>

          {mode === "full" && (
            <div className="shrink-0 text-right">
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <p className="text-base font-semibold text-foreground">
                  {totalAmount != null ? `¥${totalAmount.toFixed(2)}` : "—"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}

      {showPricing && mode === "full" && (
        <>
          {!isLoading && breakdown && breakdown.length > 0 && (
            <>
              <Separator />
              <CardContent className="space-y-1 py-3">
                {breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/60">{item.label}</span>
                    <span className="text-xs text-foreground/70">¥{item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </>
          )}

          <Separator />
          <CardFooter className="flex items-center justify-between border-t-0 bg-transparent px-4 py-3">
            <span className="text-xs text-muted-foreground/60">{t("subtotal")}</span>
            {isLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span className="text-sm font-semibold text-foreground/80">
                {totalAmount != null ? `¥${totalAmount.toFixed(2)}` : "—"}
              </span>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  )
}

function PricingBreakdown({
  breakdown,
  totalAmount,
  isLoading,
}: {
  breakdown: PriceBreakdownItem[] | undefined
  totalAmount: number | undefined
  isLoading?: boolean
}) {
  const t = useTranslations("Checkout")
  return (
    <div className="space-y-3">
      {!isLoading && breakdown && breakdown.length > 0 && (
        <div className="space-y-2">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/60">{item.label}</span>
              <span className="text-xs text-foreground/70">¥{item.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/70">{t("subtotal")}</span>
        {isLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <span className="text-lg font-semibold text-foreground">
            {totalAmount != null ? `¥${totalAmount.toFixed(2)}` : "—"}
          </span>
        )}
      </div>
    </div>
  )
}
