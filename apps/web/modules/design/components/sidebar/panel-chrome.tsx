import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface PanelChromeProps {
  side: "left" | "right"
  children: ReactNode
  /** 自定义侧栏背景色；有值时覆盖 bg-sidebar */
  backgroundColor?: string
}

export function PanelChrome({ side, children, backgroundColor }: PanelChromeProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col overflow-y-auto overflow-x-hidden",
        "text-sidebar-foreground",
        !backgroundColor && "bg-sidebar",
        side === "left" ? "border-r border-sidebar-border" : "border-l border-sidebar-border",
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {children}
    </aside>
  )
}
