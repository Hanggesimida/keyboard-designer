"use client"

import { useState } from "react"
import { Eye, EyeOff, Link2, Link2Off } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useMultiKeycapEditor } from "@/modules/design/hooks/useMultiKeycapEditor"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import { isGradientValue } from "@/modules/design/lib/design/gradientUtils"
import type { KeycapOverride } from "@/modules/design/store/designUiStore"
import { LabelAlignmentGrid } from "./AlignmentGrid"
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

  const [keycapColorLinked, setKeycapColorLinked] = useState(false)

  const allBordersHidden =
    selectedIds.length > 0 &&
    selectedIds.every((id) =>
      resolveEffectiveBorderHidden(layerOverrides[id], e.globalKeycapStyle),
    )

  return (
    <div
      className={cn(
        "mt-3 flex flex-col gap-3 border-t border-border/40 pt-3",
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

      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] font-normal text-muted-foreground">
          字号 (px)
          {e.fontSize.isMixed && (
            <span className="ml-1.5 text-[10px] text-orange-400/80">混合</span>
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
        label="键帽底色"
        value={e.bgColor.value}
        fallback={e.globalKeycapStyle.bgColor}
        isMixed={e.bgColor.isMixed}
        disabled={disabled}
        onChange={(next) => {
          if (isGradientValue(next)) {
            e.applyGradientAcrossSelection(next, "bgColor")
            if (keycapColorLinked) e.applyGradientAcrossSelection(next, "topColor")
          } else {
            e.applyPatch({ bgColor: next })
            if (keycapColorLinked) e.applyPatch({ topColor: next })
          }
        }}
      />
      <div className="flex items-center gap-1.5 -my-0.5">
        <div className="h-px flex-1 bg-border/30" />
        <button
          type="button"
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground",
            keycapColorLinked && "text-primary/70 hover:text-primary",
          )}
          title={keycapColorLinked ? "解除顶面与底色联动" : "联动顶面与底色"}
          onClick={() => setKeycapColorLinked((v) => !v)}
        >
          {keycapColorLinked ? (
            <Link2 className="size-3" />
          ) : (
            <Link2Off className="size-3" />
          )}
        </button>
        <div className="h-px flex-1 bg-border/30" />
      </div>
      <ColorRow
        label="键帽顶面"
        value={e.topColor.value}
        fallback={e.globalKeycapStyle.topColor}
        isMixed={e.topColor.isMixed}
        disabled={disabled}
        onChange={(next) => {
          if (isGradientValue(next)) {
            e.applyGradientAcrossSelection(next, "topColor")
            if (keycapColorLinked) e.applyGradientAcrossSelection(next, "bgColor")
          } else {
            e.applyPatch({ topColor: next })
            if (keycapColorLinked) e.applyPatch({ bgColor: next })
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
