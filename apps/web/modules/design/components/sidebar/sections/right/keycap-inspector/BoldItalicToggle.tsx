"use client"

import { cn } from "@workspace/ui/lib/utils"

interface BoldItalicToggleProps {
  isBold: boolean
  isItalic: boolean
  fontCaps: { bold: boolean; italic: boolean }
  onToggleBold: () => void
  onToggleItalic: () => void
  disabled?: boolean
  /** 多选时部分键帽粗体不一致 */
  boldMixed?: boolean
  /** 多选时部分键帽斜体不一致 */
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
      <button
        type="button"
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
          "flex h-7 w-7 items-center justify-center rounded border text-xs font-bold transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-30",
          boldMixed
            ? "border-orange-400/50 bg-transparent text-orange-400/70"
            : isBold && fontCaps.bold
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
        onClick={onToggleBold}
      >
        B
      </button>
      <button
        type="button"
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
          "flex h-7 w-7 items-center justify-center rounded border text-xs italic transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-30",
          italicMixed
            ? "border-orange-400/50 bg-transparent text-orange-400/70"
            : isItalic && fontCaps.italic
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        )}
        onClick={onToggleItalic}
      >
        I
      </button>
    </div>
  )
}
