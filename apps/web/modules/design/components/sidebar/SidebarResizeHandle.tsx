"use client"

import type { MouseEventHandler, PointerEventHandler } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface SidebarResizeHandleProps {
  side: "left" | "right"
  width: number
  min: number
  max: number
  label: string
  title: string
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onDoubleClick: MouseEventHandler<HTMLDivElement>
}

export function SidebarResizeHandle({
  side,
  width,
  min,
  max,
  label,
  title,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: SidebarResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      aria-label={label}
      title={title}
      className={cn(
        "absolute top-0 z-20 flex h-full w-1 touch-none select-none cursor-ew-resize items-center justify-center bg-transparent hover:bg-border/40 active:bg-border/60",
        side === "left" ? "right-0" : "left-0",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <div className="pointer-events-none h-10 w-0.5 rounded-full bg-muted-foreground/40" />
    </div>
  )
}
