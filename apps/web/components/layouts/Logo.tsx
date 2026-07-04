import { cn } from "@workspace/ui/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/images/logo.svg"
        alt=""
        className="h-5 w-5 shrink-0"
        aria-hidden
      />
      <span className="text-foreground text-sm font-semibold">烬炆外设</span>
    </span>
  )
}
