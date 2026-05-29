"use client"

import { Link2, Link2Off } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface ColorLinkDividerProps {
  linked: boolean
  onToggle: () => void
}

export function ColorLinkDivider({ linked, onToggle }: ColorLinkDividerProps) {
  return (
    <div className="flex items-center gap-1.5 -my-0.5">
      <div className="h-px flex-1 bg-border/30" />
      <button
        type="button"
        className={cn(
          "cursor-pointer",
          "flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground",
          linked && "text-primary/70 hover:text-primary",
        )}
        title={linked ? "解除顶面与底色联动" : "联动顶面与底色"}
        onClick={onToggle}
      >
        {linked ? (
          <Link2 className="size-3" />
        ) : (
          <Link2Off className="size-3" />
        )}
      </button>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  )
}
