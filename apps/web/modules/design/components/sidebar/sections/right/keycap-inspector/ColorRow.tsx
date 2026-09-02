"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { HexColorPicker } from "@/modules/design/components/pickers/HexColorPicker"
import { isValidHex } from "@/modules/design/lib/keycap-inspector/constants"
import { isGradientValue } from "@/modules/design/lib/design/gradientUtils"

interface ColorRowProps {
  label: string
  value: string
  fallback?: string
  onChange: (next: string) => void
  disabled?: boolean
  /** 值存在混合情况（多选时部分键帽颜色不同） */
  isMixed?: boolean
  /** 渲染在颜色输入框右侧的额外操作节点 */
  action?: React.ReactNode
  /** 隐藏组件内部的 label，由外部自行渲染 */
  hideLabel?: boolean
}

export function ColorRow({
  label,
  value,
  fallback = "",
  onChange,
  disabled,
  isMixed,
  action,
  hideLabel,
}: ColorRowProps) {
  const tCommon = useTranslations("Common")
  const t = useTranslations("Design.inspector")
  const display = value || fallback
  const [hexInput, setHexInput] = useState(display)

  useEffect(() => {
    setHexInput(display)
  }, [display])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    if (!disabled && isValidHex(val)) onChange(val)
  }

  const handlePickerChange = (hex: string) => {
    if (disabled) return
    setHexInput(hex)
    onChange(hex)
  }

  const isGradient = isGradientValue(display)

  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-50")}>
      {!hideLabel && (
        <Label className="text-[11px] font-normal text-muted-foreground">
          {label}
          {isMixed && (
            <span className="ml-1.5 text-[10px] text-chart-4/80">{tCommon("mixed")}</span>
          )}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <HexColorPicker value={display} onChange={handlePickerChange} />
        <Input
          type="text"
          value={isMixed ? tCommon("mixed") : isGradient ? t("gradient") : hexInput}
          onChange={isGradient ? undefined : handleHexChange}
          readOnly={isGradient}
          onFocus={() => {
            if (isMixed) setHexInput(display)
          }}
          onBlur={() => {
            if (!isGradient && !isValidHex(hexInput)) setHexInput(display)
          }}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          className={cn(
            "h-7 flex-1 font-mono text-xs",
            isGradient && "text-muted-foreground",
          )}
        />
        {action}
      </div>
    </div>
  )
}
