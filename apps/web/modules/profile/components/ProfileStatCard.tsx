import { cn } from "@workspace/ui/lib/utils"
import type { LucideIcon } from "lucide-react"

interface ProfileStatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** 描述文字或趋势 */
  hint?: string
  className?: string
}

export function ProfileStatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: ProfileStatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-muted/40 p-4 backdrop-blur-sm",
        "hover:border-border hover:bg-muted/50 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground/70 font-medium mb-1.5">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground/55 truncate">{hint}</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border flex items-center justify-center shrink-0">
          <Icon size={15} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
