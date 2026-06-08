import { cn } from "@workspace/ui/lib/utils"

interface ProfileSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  /** 右上角的操作区 */
  action?: React.ReactNode
}

export function ProfileSection({
  title,
  description,
  children,
  className,
  action,
}: ProfileSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-white/70">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-white/35">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
