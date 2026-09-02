import { Link } from "@/i18n/navigation"
import { cn } from "@workspace/ui/lib/utils"
import type { LucideIcon } from "lucide-react"

interface ProfileEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: ProfileEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 rounded-xl border border-dashed border-border text-center",
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center mb-3">
        <Icon size={18} className="text-muted-foreground/55" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground/55 max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-200"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
