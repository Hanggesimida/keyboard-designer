import { cn } from "@workspace/ui/lib/utils"

export function LogoIcon({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo.svg"
      alt=""
      aria-hidden
      className={cn("size-5 shrink-0", className)}
    />
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon />
      <span className="text-foreground text-sm font-semibold">烬炆外设</span>
    </span>
  )
}
