import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface PanelChromeProps {
  side: "left" | "right"
  children: ReactNode
}

export function PanelChrome({ side, children }: PanelChromeProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col overflow-y-auto overflow-x-hidden",
        "bg-sidebar text-sidebar-foreground",
        side === "left" ? "border-r border-sidebar-border" : "border-l border-sidebar-border",
      )}
    >
      {children}
    </aside>
  )
}
