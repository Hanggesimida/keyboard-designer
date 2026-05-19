"use client"

import { useEffect, useState } from "react"
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Link2,
  Link2Off,
  RotateCcw,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { HexColorPicker } from "@/modules/design/components/pickers/HexColorPicker"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { FONT_CATEGORIES, FONT_OPTIONS } from "./font-options"

const FONT_SIZE_MIN = 6
const FONT_SIZE_MAX = 32

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

interface ColorRowProps {
  label: string
  value: string
  onChange: (next: string) => void
  action?: React.ReactNode
}

function ColorRow({ label, value, onChange, action }: ColorRowProps) {
  const [hexInput, setHexInput] = useState(value)

  useEffect(() => {
    setHexInput(value)
  }, [value])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) onChange(val)
  }

  const handlePickerChange = (hex: string) => {
    setHexInput(hex)
    onChange(hex)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <HexColorPicker value={value} onChange={handlePickerChange} />
        <Input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={() => {
            if (!isValidHex(hexInput)) setHexInput(value)
          }}
          spellCheck={false}
          maxLength={7}
          className="h-7 flex-1 font-mono text-xs"
        />
        {action}
      </div>
    </div>
  )
}

export function GlobalKeycapSection() {
  const globalKeycapStyle = useDesignUIStore((s) => s.globalKeycapStyle)
  const setGlobalKeycapStyle = useDesignUIStore((s) => s.setGlobalKeycapStyle)
  const resetGlobalKeycapStyleSettings = useDesignUIStore(
    (s) => s.resetGlobalKeycapStyleSettings,
  )
  const fontFamily = useDesignUIStore((s) => s.fontFamily)
  const setFontFamily = useDesignUIStore((s) => s.setFontFamily)

  const [fontFamilyOpen, setFontFamilyOpen] = useState(false)
  const [keycapColorLinked, setKeycapColorLinked] = useState(false)
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

  const fontFamilyLabel =
    FONT_OPTIONS.find((f) => f.value === fontFamily)?.label ?? "自定义"

  return (
    <PanelSection title="全局键帽样式" collapsible defaultOpen={false}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="global-keycap-font-family-trigger"
            className="text-[11px] font-normal text-muted-foreground"
          >
            字体族
          </Label>
          <Popover open={fontFamilyOpen} onOpenChange={setFontFamilyOpen}>
            <PopoverTrigger asChild>
              <Button
                id="global-keycap-font-family-trigger"
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={fontFamilyOpen}
                className="h-8 w-full justify-between gap-2 px-2.5 font-normal shadow-none"
                style={{ fontFamily }}
              >
                <span className="min-w-0 flex-1 truncate text-left text-xs">
                  {fontFamilyLabel}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-[var(--radix-popover-trigger-width)] p-1"
            >
              <div className="flex max-h-72 flex-col gap-px overflow-y-auto p-0.5">
                {FONT_CATEGORIES.map((cat) => {
                  const items = FONT_OPTIONS.filter((f) => f.category === cat.key)
                  if (items.length === 0) return null
                  return (
                    <div key={cat.key}>
                      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        {cat.label}
                      </div>
                      {items.map((f) => {
                        const selected = fontFamily === f.value
                        return (
                          <button
                            key={f.value}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              selected && "bg-accent text-accent-foreground",
                            )}
                            style={{ fontFamily: f.value }}
                            onClick={() => {
                              setFontFamily(f.value)
                              setFontFamilyOpen(false)
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">{f.label}</span>
                            {selected ? (
                              <Check className="size-3.5 shrink-0 opacity-80" />
                            ) : (
                              <span className="size-3.5 shrink-0" aria-hidden />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          <div
            className="rounded-md border border-border bg-sidebar-accent/30 px-2 py-1.5 text-[13px] text-sidebar-foreground"
            style={{ fontFamily }}
          >
            AaBbCc 键帽文字
          </div>
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
          label="键帽顶面"
          value={globalKeycapStyle.topColor}
          onChange={(next) => {
            // 合并为单次 store 更新，避免触发两轮订阅者重渲染
            setGlobalKeycapStyle(keycapColorLinked ? { topColor: next, bgColor: next } : { topColor: next })
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
          label="键帽底色"
          value={globalKeycapStyle.bgColor}
          onChange={(next) => {
            setGlobalKeycapStyle(keycapColorLinked ? { bgColor: next, topColor: next } : { bgColor: next })
          }}
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
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
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
          className="mt-1 h-8 w-full gap-1.5 font-normal shadow-none"
          onClick={() => {
            resetGlobalKeycapStyleSettings()
            setKeycapColorLinked(false)
          }}
        >
          <RotateCcw className="size-3.5 opacity-70" />
          重置所有样式设置
        </Button>
      </div>
    </PanelSection>
  )
}
