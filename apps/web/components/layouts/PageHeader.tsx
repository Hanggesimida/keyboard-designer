import { type ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6",
        action && "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:mb-6 mb-4",
        className,
      )}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 sm:self-end">{action}</div>
      )}
    </div>
  )
}
