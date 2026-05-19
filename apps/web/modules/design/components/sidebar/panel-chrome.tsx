import type { ReactNode } from "react"

interface PanelChromeProps {
  side: "left" | "right"
  children: ReactNode
}

export function PanelChrome({ side, children }: PanelChromeProps) {
  return (
    <aside
      className={[
        "flex h-full w-full flex-col overflow-y-auto overflow-x-hidden",
        "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
        side === "left"
          ? "border-r border-[var(--border)]"
          : "border-l border-[var(--border)]",
      ].join(" ")}
    >
      {children}
    </aside>
  )
}
