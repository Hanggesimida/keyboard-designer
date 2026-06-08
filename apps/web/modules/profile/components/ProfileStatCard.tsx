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
        "relative rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-sm",
        "hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-white/40 font-medium mb-1.5">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-white/90">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-white/30 truncate">{hint}</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
          <Icon size={15} className="text-white/50" />
        </div>
      </div>
    </div>
  )
}
