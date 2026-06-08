import Link from "next/link"
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
        "flex flex-col items-center justify-center py-14 px-6 rounded-xl border border-dashed border-white/[0.08] text-center",
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3">
        <Icon size={18} className="text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-white/30 max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-white text-[#0d0d0d] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
