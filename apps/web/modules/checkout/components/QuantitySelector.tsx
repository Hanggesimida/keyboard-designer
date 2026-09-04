"use client"

import { Minus, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import {
  ORDER_QUANTITY_MAX,
  ORDER_QUANTITY_MIN,
} from "@/modules/checkout/constants"
import { useSyncedState } from "@/hooks/useSyncedState"

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function QuantitySelector({
  value,
  onChange,
  min = ORDER_QUANTITY_MIN,
  max = ORDER_QUANTITY_MAX,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const t = useTranslations("Checkout")
  const [inputValue, setInputValue] = useSyncedState(String(value))

  function commitValue(raw: string) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) {
      setInputValue(String(value))
      return
    }
    const next = clamp(parsed, min, max)
    setInputValue(String(next))
    if (next !== value) onChange(next)
  }

  function updateValue(next: number) {
    const clamped = clamp(next, min, max)
    setInputValue(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  function handleInputChange(raw: string) {
    if (/^\d*$/.test(raw)) setInputValue(raw)
  }

  function handleBlur() {
    commitValue(inputValue)
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 cursor-pointer"
        disabled={disabled || value <= min}
        onClick={() => updateValue(value - 1)}
        aria-label={t("decreaseQty")}
      >
        <Minus size={14} />
      </Button>

      <Input
        type="text"
        inputMode="numeric"
        value={inputValue}
        disabled={disabled}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        className="h-8 w-14 px-1 text-center tabular-nums"
        aria-label={t("qty")}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 cursor-pointer"
        disabled={disabled || value >= max}
        onClick={() => updateValue(value + 1)}
        aria-label={t("increaseQty")}
      >
        <Plus size={14} />
      </Button>
    </div>
  )
}
