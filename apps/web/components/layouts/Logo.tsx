import { useId } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@workspace/ui/lib/utils"

export function LogoIcon({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="5.5" className="fill-brand" />
      <rect x="1" y="1" width="22" height="22" rx="5.5" fill={`url(#${id}-wall)`} />
      <rect x="5" y="2.5" width="14" height="15" rx="3.5" className="fill-brand" />
      <rect x="5" y="2.5" width="14" height="15" rx="3.5" fill={`url(#${id}-top)`} />
      <rect
        x="7.2"
        y="5"
        width="4.8"
        height="1.8"
        rx="0.9"
        className="fill-brand-foreground"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  const t = useTranslations("Common")
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcon />
      <span className="text-[0.9375rem] font-bold tracking-tight text-foreground">
        {t("appName")}
      </span>
    </span>
  )
}
