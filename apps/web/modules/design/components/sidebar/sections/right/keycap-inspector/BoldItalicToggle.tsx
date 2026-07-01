"use client"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface BoldItalicToggleProps {
  isBold: boolean
  isItalic: boolean
  fontCaps: { bold: boolean; italic: boolean }
  onToggleBold: () => void
  onToggleItalic: () => void
  disabled?: boolean
  boldMixed?: boolean
  italicMixed?: boolean
}

export function BoldItalicToggle({
  isBold,
  isItalic,
  fontCaps,
  onToggleBold,
  onToggleItalic,
  disabled,
  boldMixed,
  italicMixed,
}: BoldItalicToggleProps) {
  return (
    <div className="flex gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title={
          fontCaps.bold
            ? boldMixed
              ? "混合（点击统一加粗）"
              : isBold
                ? "取消加粗"
                : "加粗"
            : "当前字体不支持加粗"
        }
        disabled={disabled || !fontCaps.bold}
        className={cn(
          "text-xs font-bold",
          boldMixed && "border-chart-4 text-chart-4",
          !boldMixed && isBold && fontCaps.bold && "border-primary bg-primary/15 text-primary",
        )}
        onClick={onToggleBold}
      >
        B
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title={
          fontCaps.italic
            ? italicMixed
              ? "混合（点击统一斜体）"
              : isItalic
                ? "取消斜体"
                : "斜体"
            : "当前字体不支持斜体"
        }
        disabled={disabled || !fontCaps.italic}
        className={cn(
          "text-xs italic",
          italicMixed && "border-chart-4 text-chart-4",
          !italicMixed && isItalic && fontCaps.italic && "border-primary bg-primary/15 text-primary",
        )}
        onClick={onToggleItalic}
      >
        I
      </Button>
    </div>
  )
}
