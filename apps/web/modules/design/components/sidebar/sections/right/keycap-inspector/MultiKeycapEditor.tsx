"use client"

import { useMemo } from "react"
import { Eye, EyeOff, X } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useMultiKeycapEditor } from "@/modules/design/hooks/useMultiKeycapEditor"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import { isGradientValue } from "@/modules/design/lib/design/gradientUtils"
import {
  getMixedLetterSpacing,
  getMixedLineHeightRatio,
  getMixedFontWeight,
  getMixedFontStyle,
  DEFAULT_LETTER_SPACING,
  DEFAULT_LINE_HEIGHT_RATIO,
} from "@/modules/design/lib/keycap-inspector/mixed"
import { useDesignUIStore, type KeycapOverride } from "@/modules/design/store/designUiStore"
import { getFontCapabilities } from "@/modules/design/components/sidebar/sections/right/font-options"
import { LabelAlignmentGrid } from "./AlignmentGrid"
import { BoldItalicToggle } from "./BoldItalicToggle"
import { ColorRow } from "./ColorRow"
import { FontFamilySelect } from "./FontFamilySelect"

interface MultiKeycapEditorProps {
  selectedIds: string[]
  layerId: string
  layerOverrides: Record<string, KeycapOverride>
  disabled?: boolean
}

export function MultiKeycapEditor({
  selectedIds,
  layerId,
  layerOverrides,
  disabled,
}: MultiKeycapEditorProps) {
  const e = useMultiKeycapEditor({
    selectedIds,
    layerId,
    layerOverrides,
    disabled,
  })

  const globalFontWeight = useDesignUIStore((s) => s.fontWeight)
  const globalFontStyle = useDesignUIStore((s) => s.fontStyle)

  const letterSpacing = useMemo(
    () => getMixedLetterSpacing(selectedIds, layerOverrides),
    [selectedIds, layerOverrides],
  )
  const lineHeightRatio = useMemo(
    () => getMixedLineHeightRatio(selectedIds, layerOverrides),
    [selectedIds, layerOverrides],
  )
  const fontWeightMixed = useMemo(
    () => getMixedFontWeight(selectedIds, layerOverrides, globalFontWeight),
    [selectedIds, layerOverrides, globalFontWeight],
  )
  const fontStyleMixed = useMemo(
    () => getMixedFontStyle(selectedIds, layerOverrides, globalFontStyle),
    [selectedIds, layerOverrides, globalFontStyle],
  )

  const isBold = !fontWeightMixed.isMixed && fontWeightMixed.value === 700
  const isItalic = !fontStyleMixed.isMixed && fontStyleMixed.value === "italic"
  const fontCaps = getFontCapabilities(e.fontFamily.value)

  const toggleBold = () => {
    if (disabled || !fontCaps.bold) return
    const next = isBold ? 400 : 700
    e.applyPatch({ fontWeight: next === globalFontWeight ? undefined : next })
  }
  const toggleItalic = () => {
    if (disabled || !fontCaps.italic) return
    const next = isItalic ? "normal" : "italic"
    e.applyPatch({ fontStyle: next === globalFontStyle ? undefined : next })
  }

  const allBordersHidden =
    selectedIds.length > 0 &&
    selectedIds.every((id) =>
      resolveEffectiveBorderHidden(layerOverrides[id], e.globalKeycapStyle),
    )

  return (
    <div
      className={cn(
        "mt-2 flex flex-col gap-3",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <FontFamilySelect
        label="字体族"
        effectiveFontFamily={e.fontFamily.value}
        isMixed={e.fontFamily.isMixed}
        disabled={disabled}
        open={e.fontPopoverOpen}
        onOpenChange={e.setFontPopoverOpen}
        onPick={e.handleFontFamilyPick}
      />

      <BoldItalicToggle
        isBold={isBold}
        isItalic={isItalic}
        fontCaps={fontCaps}
        onToggleBold={toggleBold}
        onToggleItalic={toggleItalic}
        disabled={disabled}
        boldMixed={fontWeightMixed.isMixed}
        italicMixed={fontStyleMixed.isMixed}
      />

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-normal text-muted-foreground">
          字号 (px)
          {e.fontSize.isMixed && (
            <span className="ml-1.5 text-[10px] text-chart-4/80">混合</span>
          )}
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          value={e.fontSizeInput}
          onChange={(ev) => e.handleFontSizeStepperChange(ev.target.value)}
          onBlur={() => e.commitFontSize()}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") ev.currentTarget.blur()
            if (ev.key === "Escape") {
              e.resetFontSizeInput()
              ev.currentTarget.blur()
            }
          }}
          disabled={disabled}
          className="h-7 text-xs tabular-nums"
        />
      </div>

      {/* 字间距 + 行距 */}
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-[11px] font-normal text-muted-foreground">
            字间距
            {letterSpacing.isMixed && (
              <span className="ml-1.5 text-[10px] text-chart-4/80">混合</span>
            )}
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min={-3}
            max={10}
            step={0.5}
            value={letterSpacing.isMixed ? "" : letterSpacing.value}
            placeholder={letterSpacing.isMixed ? "混合" : String(DEFAULT_LETTER_SPACING)}
            onChange={(ev) =>
              e.applyPatch({ letterSpacing: Number(ev.target.value) })
            }
            disabled={disabled}
            className="h-7 text-xs tabular-nums"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-[11px] font-normal text-muted-foreground">
            行距
            {lineHeightRatio.isMixed && (
              <span className="ml-1.5 text-[10px] text-chart-4/80">混合</span>
            )}
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min={0.8}
            max={3}
            step={0.1}
            value={lineHeightRatio.isMixed ? "" : Number(lineHeightRatio.value.toFixed(1))}
            placeholder={lineHeightRatio.isMixed ? "混合" : String(DEFAULT_LINE_HEIGHT_RATIO)}
            onChange={(ev) =>
              e.applyPatch({ lineHeightRatio: Number(ev.target.value) })
            }
            disabled={disabled}
            className="h-7 text-xs tabular-nums"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-normal text-muted-foreground">文案</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-400"
          disabled={disabled}
          onClick={() => e.applyPatch({ labelText: "" })}
          tabIndex={-1}
        >
          <X className="h-3 w-3" />
          清空文案
        </Button>
      </div>

      <LabelAlignmentGrid disabled={disabled} onAlign={e.handleAlignMulti} />

      <ColorRow
        label="文字颜色"
        value={e.labelColor.value}
        fallback={e.globalKeycapStyle.labelColor}
        isMixed={e.labelColor.isMixed}
        disabled={disabled}
        onChange={(next) => e.applyPatch({ labelColor: next })}
      />
      <ColorRow
        label="键帽颜色"
        value={e.color.value}
        fallback={e.globalKeycapStyle.color}
        isMixed={e.color.isMixed}
        disabled={disabled}
        onChange={(next) => {
          if (isGradientValue(next)) {
            e.applyGradientAcrossSelection(next, "color")
          } else {
            e.applyPatch({ color: next })
          }
        }}
      />
      <ColorRow
        label="边框颜色"
        value={e.borderColor.value}
        fallback={e.globalKeycapStyle.borderColor}
        isMixed={e.borderColor.isMixed}
        disabled={disabled}
        onChange={(next) => e.applyPatch({ borderColor: next })}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={disabled}
            title={allBordersHidden ? "显示边框" : "隐藏边框"}
            onClick={() => {
              if (allBordersHidden) {
                if (e.globalKeycapStyle.borderHidden) {
                  e.applyPatch({ borderHidden: false })
                } else {
                  e.applyPatch({ borderHidden: undefined })
                }
              } else {
                e.applyPatch({ borderHidden: true })
              }
            }}
          >
            {allBordersHidden ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
        }
      />

      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={disabled || !e.hasAnyOverride}
        onClick={e.resetSelection}
        className="self-end"
      >
        重置所有选中键帽
      </Button>
    </div>
  )
}
