"use client"

import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import {
  ALIGN_POSITIONS,
  type AlignH,
  type AlignV,
} from "@/modules/design/lib/keycap-inspector/align"

function AlignmentIcon({ alignH, alignV }: { alignH: AlignH; alignV: AlignV }) {
  const cx = alignH === "left" ? 3.5 : alignH === "center" ? 7 : 10.5
  const cy = alignV === "top" ? 3 : alignV === "middle" ? 6 : 9
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
      <rect
        x="0.75"
        y="0.75"
        width="12.5"
        height="10.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="0.9"
        fill="none"
        opacity="0.45"
      />
      <circle cx={cx} cy={cy} r="1.4" fill="currentColor" />
    </svg>
  )
}

interface LabelAlignmentGridProps {
  disabled?: boolean
  onAlign: (alignH: AlignH, alignV: AlignV) => void
}

export function LabelAlignmentGrid({
  disabled,
  onAlign,
}: LabelAlignmentGridProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-normal text-muted-foreground">
        文字位置
      </Label>
      <div
        className="grid grid-cols-3 gap-0.5"
        style={{ width: "fit-content" }}
      >
        {ALIGN_POSITIONS.map(({ alignH, alignV, title }) => (
          <button
            key={`${alignH}-${alignV}`}
            type="button"
            title={title}
            disabled={disabled}
            onClick={() => onAlign(alignH, alignV)}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border border-border/50",
              "bg-background text-foreground/70 transition-colors",
              "hover:border-border hover:bg-accent hover:text-accent-foreground",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <AlignmentIcon alignH={alignH} alignV={alignV} />
          </button>
        ))}
      </div>
    </div>
  )
}
