"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { getFontCapabilities } from "./font-options"
import { BoldItalicToggle } from "./keycap-inspector/BoldItalicToggle"
import { ColorRow } from "./keycap-inspector/ColorRow"
import { FontFamilySelect } from "./keycap-inspector/FontFamilySelect"
import { toCssFontFamily } from "@/lib/fonts/fontRef"

const FONT_SIZE_MIN = 6
const FONT_SIZE_MAX = 32

export function GlobalKeycapSection() {
  const globalKeycapStyle = useDesignUIStore((s) => s.globalKeycapStyle)
  const setGlobalKeycapStyle = useDesignUIStore((s) => s.setGlobalKeycapStyle)
  const resetGlobalKeycapStyleSettings = useDesignUIStore(
    (s) => s.resetGlobalKeycapStyleSettings,
  )
  const fontFamily = useDesignUIStore((s) => s.fontFamily)
  const setFontFamily = useDesignUIStore((s) => s.setFontFamily)
  const fontWeight = useDesignUIStore((s) => s.fontWeight)
  const setFontWeight = useDesignUIStore((s) => s.setFontWeight)
  const fontStyle = useDesignUIStore((s) => s.fontStyle)
  const setFontStyle = useDesignUIStore((s) => s.setFontStyle)

  const fontCaps = getFontCapabilities(fontFamily)
  const isBold = fontWeight === 700
  const isItalic = fontStyle === "italic"

  const [fontFamilyOpen, setFontFamilyOpen] = useState(false)
  const [fontSizeInput, setFontSizeInput] = useState(
    String(globalKeycapStyle.fontSize),
  )

  useEffect(() => {
    setFontSizeInput(String(globalKeycapStyle.fontSize))
  }, [globalKeycapStyle.fontSize])

  const commitFontSize = (directValue?: string) => {
    const parsed = Number.parseInt(directValue ?? fontSizeInput, 10)
    if (Number.isNaN(parsed)) {
      setFontSizeInput(String(globalKeycapStyle.fontSize))
      return
    }
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed))
    setFontSizeInput(String(clamped))
    setGlobalKeycapStyle({ fontSize: clamped })
  }

  return (
    <PanelSection title="全局键帽样式" collapsible defaultOpen={false}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <FontFamilySelect
            label="字体族"
            triggerId="global-keycap-font-family-trigger"
            effectiveFontFamily={fontFamily}
            open={fontFamilyOpen}
            onOpenChange={setFontFamilyOpen}
            onPick={(family) => {
              setFontFamily(family)
              const caps = getFontCapabilities(family)
              if (!caps.bold && fontWeight === 700) setFontWeight(400)
              if (!caps.italic && fontStyle === "italic") setFontStyle("normal")
              setFontFamilyOpen(false)
            }}
          />
          <div
            className="rounded-md border border-border bg-sidebar-accent/30 px-2 py-1.5 text-[13px] text-sidebar-foreground"
            style={{
              fontFamily: toCssFontFamily(fontFamily),
              fontWeight,
              fontStyle,
            }}
          >
            AaBbCc 键帽文字
          </div>

          <BoldItalicToggle
            isBold={isBold}
            isItalic={isItalic}
            fontCaps={fontCaps}
            onToggleBold={() => setFontWeight(isBold ? 400 : 700)}
            onToggleItalic={() => setFontStyle(isItalic ? "normal" : "italic")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="global-keycap-fontsize"
            className="text-[11px] font-normal text-muted-foreground"
          >
            字号 (px)
          </Label>
          <Input
            id="global-keycap-fontsize"
            type="number"
            inputMode="numeric"
            value={fontSizeInput}
            onChange={(e) => {
              const value = e.target.value
              setFontSizeInput(value)
              const parsed = Number.parseInt(value, 10)
              if (
                !Number.isNaN(parsed) &&
                parsed >= FONT_SIZE_MIN &&
                parsed <= FONT_SIZE_MAX
              ) {
                setGlobalKeycapStyle({ fontSize: parsed })
              }
            }}
            onBlur={() => commitFontSize()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setFontSizeInput(String(globalKeycapStyle.fontSize))
                e.currentTarget.blur()
              }
            }}
            className="h-7 text-xs tabular-nums"
          />
        </div>

        <ColorRow
          label="文字颜色"
          value={globalKeycapStyle.labelColor}
          onChange={(next) => setGlobalKeycapStyle({ labelColor: next })}
        />
        <ColorRow
          label="键帽颜色"
          value={globalKeycapStyle.color}
          // 渐变表示整盘按方向分配纯色；渲染侧 resolveKeycapBodyColor 采样
          onChange={(next) => setGlobalKeycapStyle({ color: next })}
        />
        <ColorRow
          label="边框颜色"
          value={globalKeycapStyle.borderColor}
          onChange={(next) => setGlobalKeycapStyle({ borderColor: next })}
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title={globalKeycapStyle.borderHidden ? "显示边框" : "隐藏边框"}
              onClick={() =>
                setGlobalKeycapStyle({
                  borderHidden: !globalKeycapStyle.borderHidden,
                })
              }
            >
              {globalKeycapStyle.borderHidden ? (
                <EyeOff className="size-3.5" />
              ) : (
                <Eye className="size-3.5" />
              )}
            </Button>
          }
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-8 w-full gap-1.5 font-normal shadow-none cursor-pointer"
          onClick={() => {
            resetGlobalKeycapStyleSettings()
          }}
        >
          <RotateCcw className="size-3.5 opacity-70" />
          重置所有样式设置
        </Button>
      </div>
    </PanelSection>
  )
}
