"use client"

import { useState } from "react"
import { Eye, EyeOff, Link2, Link2Off } from "lucide-react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useSingleKeycapEditor } from "@/modules/design/hooks/useSingleKeycapEditor"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import type { RowedKeyDef } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import type { KeycapOverride } from "@/modules/design/store/designUiStore"
import { LabelAlignmentGrid } from "./AlignmentGrid"
import { ColorRow } from "./ColorRow"
import { FontFamilySelect } from "./FontFamilySelect"

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

  const [keycapColorLinked, setKeycapColorLinked] = useState(false)

  const borderEffectivelyHidden = resolveEffectiveBorderHidden(
    override,
    e.globalKeycapStyle,
  )

  return (
    <div
      className={cn(
        "mt-3 flex flex-col gap-3 border-t border-border/40 pt-3",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="keycap-label-input"
          className="text-[11px] font-normal text-muted-foreground"
        >
          文案
        </Label>
        <Input
          id="keycap-label-input"
          type="text"
          value={e.labelInput}
          onChange={(ev) => e.handleLabelChange(ev.target.value)}
          onBlur={e.commitLabel}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") ev.currentTarget.blur()
            if (ev.key === "Escape") {
              e.onLabelEscape()
              ev.currentTarget.blur()
            }
          }}
          disabled={disabled}
          placeholder={keyDef.label}
          className="h-7 text-xs"
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

      <LabelAlignmentGrid disabled={disabled} onAlign={e.handleAlign} />

      <ColorRow
        label="文字颜色"
        value={override?.labelColor ?? ""}
        fallback={e.globalKeycapStyle.labelColor}
        disabled={disabled}
        onChange={(next) => e.patchOverride({ labelColor: next })}
      />
      <ColorRow
        label="键帽底色"
        value={override?.bgColor ?? ""}
        fallback={e.globalKeycapStyle.bgColor}
        disabled={disabled}
        onChange={(next) => {
          e.patchOverride({ bgColor: next })
          if (keycapColorLinked) e.patchOverride({ topColor: next })
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
        value={override?.topColor ?? ""}
        fallback={e.globalKeycapStyle.topColor}
        disabled={disabled}
        onChange={(next) => {
          e.patchOverride({ topColor: next })
          if (keycapColorLinked) e.patchOverride({ bgColor: next })
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
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
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
        className="self-end"
      >
        重置该键
      </Button>
    </div>
  )
}
