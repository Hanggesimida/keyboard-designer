"use client"

import type { ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { FONT_CATEGORIES, FONT_OPTIONS } from "@/modules/design/components/sidebar/sections/right/font-options"

interface FontFamilySelectProps {
  label: ReactNode
  triggerId?: string
  /** 当前展示用字体 CSS 值（混合时可不传 style） */
  effectiveFontFamily: string
  isMixed?: boolean
  disabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (family: string) => void
}

export function FontFamilySelect({
  label,
  triggerId,
  effectiveFontFamily,
  isMixed,
  disabled,
  open,
  onOpenChange,
  onPick,
}: FontFamilySelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={triggerId}
        className="text-[11px] font-normal text-muted-foreground"
      >
        {label}
        {isMixed && (
          <span className="ml-1.5 text-[10px] text-chart-4/80">混合</span>
        )}
      </Label>
      <Popover
        open={disabled ? false : open}
        onOpenChange={disabled ? undefined : onOpenChange}
      >
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-expanded={open}
            className="h-8 w-full justify-between gap-2 px-2.5 font-normal shadow-none cursor-pointer"
            style={{
              fontFamily: isMixed ? undefined : effectiveFontFamily,
            }}
          >
            <span className="min-w-0 flex-1 truncate text-left text-xs">
              {isMixed
                ? "混合"
                : (FONT_OPTIONS.find((f) => f.value === effectiveFontFamily)
                    ?.label ?? "自定义")}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60 cursor-pointer" />
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
                    const selected = !isMixed && effectiveFontFamily === f.value
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          selected && "bg-accent text-accent-foreground",
                        )}
                        style={{ fontFamily: f.value }}
                        onClick={() => onPick(f.value)}
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
    </div>
  )
}
