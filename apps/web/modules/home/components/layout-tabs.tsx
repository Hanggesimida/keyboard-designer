"use client"

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { cn } from "@workspace/ui/lib/utils"

interface LayoutTab {
  id: string
  label: string
  keyCount: number
}

export function LayoutTabs({
  tabs,
  panels,
  ariaLabel,
}: {
  tabs: readonly LayoutTab[]
  panels: readonly ReactNode[]
  ariaLabel: string
}) {
  const baseId = useId()
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      tabs.findIndex((tab) => tab.id === "ansi-75")
    )
  )
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!offset) return
    event.preventDefault()
    const next = (activeIndex + offset + tabs.length) % tabs.length
    setActiveIndex(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none]"
      >
        {tabs.map((tab, index) => {
          const active = index === activeIndex
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={`${baseId}-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded px-1.5 font-code text-[11px]",
                  active ? "bg-primary-foreground/15" : "bg-muted"
                )}
              >
                {tab.keyCount}
              </span>
            </button>
          )
        })}
      </div>

      {panels.map((panel, index) => (
        <div
          key={tabs[index]?.id ?? index}
          id={`${baseId}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={index !== activeIndex}
          className="mt-6"
        >
          {panel}
        </div>
      ))}
    </div>
  )
}
