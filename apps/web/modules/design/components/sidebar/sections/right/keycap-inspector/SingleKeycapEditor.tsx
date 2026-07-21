"use client"

import { Eye, EyeOff, X } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useSingleKeycapEditor } from "@/modules/design/hooks/useSingleKeycapEditor"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import { DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT_RATIO } from "@/modules/design/lib/keycap-inspector/mixed"
import type { RowedKeyDef } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { useDesignUIStore, type KeycapOverride } from "@/modules/design/store/designUiStore"
import { getFontCapabilities } from "@/modules/design/components/sidebar/sections/right/font-options"
import { LabelAlignmentGrid } from "./AlignmentGrid"
import { BoldItalicToggle } from "./BoldItalicToggle"
import { ColorRow } from "./ColorRow"
import { FontFamilySelect } from "./FontFamilySelect"
import {
  isGradientValue,
  parseCssLinearGradient,
  interpolateGradientColor,
} from "@/modules/design/lib/design/gradientUtils"

interface SingleKeycapEditorProps {
  keyDef: RowedKeyDef
  override: KeycapOverride | undefined
  layerId: string
  disabled?: boolean
}

export function SingleKeycapEditor({
  keyDef,
  override,
  layerId,
  disabled,
}: SingleKeycapEditorProps) {
  const e = useSingleKeycapEditor({
    layerId,
    keyDef,
    override,
    disabled,
  })

  const globalFontWeight = useDesignUIStore((s) => s.fontWeight)
  const globalFontStyle = useDesignUIStore((s) => s.fontStyle)

  const effectiveFontWeight = override?.fontWeight ?? globalFontWeight
  const effectiveFontStyle = override?.fontStyle ?? globalFontStyle
  const isBold = effectiveFontWeight === 700
  const isItalic = effectiveFontStyle === "italic"
  const fontCaps = getFontCapabilities(e.effectiveFontFamily)

  const toggleBold = () => {
    if (disabled || !fontCaps.bold) return
    const next = isBold ? 400 : 700
    e.patchOverride({ fontWeight: next === globalFontWeight ? undefined : next })
  }
  const toggleItalic = () => {
    if (disabled || !fontCaps.italic) return
    const next = isItalic ? "normal" : "italic"
    e.patchOverride({ fontStyle: next === globalFontStyle ? undefined : next })
  }

  const borderEffectivelyHidden = resolveEffectiveBorderHidden(
    override,
    e.globalKeycapStyle,
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="keycap-label-input"
            className="text-[11px] font-normal text-muted-foreground"
          >
            文案
          </Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            disabled={disabled || !e.labelInput}
            onClick={() => e.handleLabelChange("")}
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
            清空
          </Button>
        </div>
        <Textarea
          id="keycap-label-input"
          value={e.labelInput}
          onChange={(ev) => e.handleLabelChange(ev.target.value)}
          onBlur={e.commitLabel}
          onKeyDown={(ev) => {
            if (ev.key === "Escape") {
              e.onLabelEscape()
              ev.currentTarget.blur()
            }
          }}
          disabled={disabled}
          placeholder={keyDef.label}
          className="min-h-[56px] text-xs"
        />
      </div>

      <FontFamilySelect
        label="字体族（本键）"
        triggerId="keycap-font-family-trigger"
        effectiveFontFamily={e.effectiveFontFamily}
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
      />

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="keycap-fontsize-input"
          className="text-[11px] font-normal text-muted-foreground"
        >
          字号 (px)
        </Label>
        <Input
          id="keycap-fontsize-input"
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
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min={-3}
            max={10}
            step={0.5}
            value={override?.letterSpacing ?? DEFAULT_LETTER_SPACING}
            onChange={(ev) =>
              e.patchOverride({ letterSpacing: Number(ev.target.value) })
            }
            disabled={disabled}
            className="h-7 text-xs tabular-nums"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-[11px] font-normal text-muted-foreground">
            行距
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min={0.8}
            max={3}
            step={0.1}
            value={Number((override?.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO).toFixed(1))}
            onChange={(ev) =>
              e.patchOverride({ lineHeightRatio: Number(ev.target.value) })
            }
            disabled={disabled}
            className="h-7 text-xs tabular-nums"
          />
        </div>
      </div>

      <LabelAlignmentGrid disabled={disabled} onAlign={e.handleAlign} />

      <ColorRow
        label="文字颜色"
        value={override?.labelColor ?? ""}
        fallback={e.globalKeycapStyle.labelColor}
        disabled={disabled}
        onChange={(next) => e.patchOverride({ labelColor: next })}
      />
      <ColorRow
        label="键帽颜色"
        value={override?.color ?? ""}
        fallback={e.globalKeycapStyle.color}
        disabled={disabled}
        onChange={(next) => {
          if (isGradientValue(next)) {
            const parsed = parseCssLinearGradient(next)
            const solid = parsed
              ? interpolateGradientColor(parsed, 50)
              : next
            e.patchOverride({ color: solid })
            return
          }
          e.patchOverride({ color: next })
        }}
      />
      <ColorRow
        label="边框颜色"
        value={override?.borderColor ?? ""}
        fallback={e.globalKeycapStyle.borderColor}
        disabled={disabled}
        onChange={(next) => e.patchOverride({ borderColor: next })}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            disabled={disabled}
            title={borderEffectivelyHidden ? "显示边框" : "隐藏边框"}
            onClick={() => {
              if (borderEffectivelyHidden) {
                if (e.globalKeycapStyle.borderHidden) {
                  e.patchOverride({ borderHidden: false })
                } else {
                  e.patchOverride({ borderHidden: undefined })
                }
              } else {
                e.patchOverride({ borderHidden: true })
              }
            }}
          >
            {borderEffectivelyHidden ? (
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
        disabled={disabled || !e.hasOverride}
        onClick={e.resetKeycap}
        className="self-end cursor-pointer"
      >
        重置该键
      </Button>
    </div>
  )
}
