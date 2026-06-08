"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, LayoutGrid } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { TEMPLATES, useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { PanelSection } from "../../panel-section"

function getBaseKeysBounds(templateId: string) {
  const layout = getLayoutData(templateId)
  const unit = layout.baseUnit
  const baseKeys = layout.rows
    .filter((r) => (r.section ?? "base") === "base")
    .flatMap((r) => r.keys)
  let maxX = 0
  let maxY = 0
  for (const k of baseKeys) {
    maxX = Math.max(maxX, k.x + k.w)
    maxY = Math.max(maxY, k.y + k.h)
  }
  return {
    w: Math.ceil(maxX * unit),
    h: Math.ceil(maxY * unit),
  }
}

export function TemplateSection() {
  const templateId = useDesignUIStore((s) => s.templateId)
  const setTemplateId = useDesignUIStore((s) => s.setTemplateId)
  const [open, setOpen] = useState(false)

  const currentLabel =
    TEMPLATES.find((t) => t.id === templateId)?.label ?? "未知"

  const baseBounds = useMemo(() => getBaseKeysBounds(templateId), [templateId])

  return (
    <PanelSection title="模板">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="template-trigger"
          className="text-[11px] font-normal text-muted-foreground"
        >
          键盘布局
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="template-trigger"
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={open}
              className="h-8 w-full justify-between gap-2 px-2.5 font-normal shadow-none cursor-pointer"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-xs">
                <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{currentLabel}</span>
              </span>
              <ChevronDown className="size-3.5 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className="w-[var(--radix-popover-trigger-width)] p-1"
          >
            <ul className="flex max-h-64 flex-col gap-px overflow-y-auto p-0.5">
              {TEMPLATES.map((t) => {
                const selected = templateId === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={!t.enabled}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        t.enabled &&
                          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        selected &&
                          t.enabled &&
                          "bg-accent text-accent-foreground font-medium",
                        !t.enabled && "cursor-not-allowed opacity-40",
                      )}
                      onClick={() => {
                        if (!t.enabled) return
                        setTemplateId(t.id)
                        setOpen(false)
                      }}
                    >
                      <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      {selected && t.enabled ? (
                        <Check className="size-3.5 shrink-0 opacity-80" />
                      ) : (
                        <span className="size-3.5 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </PopoverContent>
        </Popover>

        <p className="text-[10px] text-muted-foreground/50 tabular-nums select-none">
          主键盘区（不含增补区）：{baseBounds.w} × {baseBounds.h} px
        </p>
      </div>
    </PanelSection>
  )
}
