import { useId } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Logo({ className }: { className?: string }) {
  const gradientId = useId()

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 shrink-0"
        aria-hidden>
        <path
          d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z"
          fill={`url(#${gradientId})`}
        />
        <defs>
          <linearGradient
            id={gradientId}
            x1="10"
            y1="0"
            x2="10"
            y2="20"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="#9B99FE" />
            <stop offset="1" stopColor="#2BC8B7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-foreground text-sm font-semibold">烬炆外设</span>
    </span>
  )
}
