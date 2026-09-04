"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"

interface PanelSectionProps {
  title?: string
  children: ReactNode
  /** 移除顶部分隔线（第一个分区用） */
  first?: boolean
  /** 头部右侧操作按钮槽 */
  action?: ReactNode
  /** 点击标题展开/收起内容 */
  collapsible?: boolean
  /** collapsible 时是否默认展开，默认 true */
  defaultOpen?: boolean
}

export function PanelSection({
  title,
  children,
  first = false,
  action,
  collapsible = false,
  defaultOpen = true,
}: PanelSectionProps) {
  const sectionClass = [
    "flex flex-col gap-0",
    !first ? "border-t border-border" : "",
  ].join(" ")

  const body = <div className="px-3 pb-3 pt-1">{children}</div>

  if (collapsible && title) {
    return (
      <section className={sectionClass}>
        <Collapsible defaultOpen={defaultOpen}>
          <div className="flex items-center justify-between gap-1 px-3 py-2">
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-0.5 text-left",
                    "outline-none ring-offset-background transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                />
              }
            >
                <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {title}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-panel-open:rotate-180 cursor-pointer" />
            </CollapsibleTrigger>
            {action}
          </div>
          <CollapsibleContent>{body}</CollapsibleContent>
        </Collapsible>
      </section>
    )
  }

  return (
    <section className={sectionClass}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
          {action}
        </div>
      )}
      {body}
    </section>
  )
}
