"use client"

import { useTranslations } from "next-intl"
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
  hideLabel?: boolean
}

function alignTitleKey(alignH: AlignH, alignV: AlignV) {
  if (alignV === "top") {
    if (alignH === "left") return "topLeft" as const
    if (alignH === "center") return "topCenter" as const
    return "topRight" as const
  }
  if (alignV === "middle") {
    if (alignH === "left") return "middleLeft" as const
    if (alignH === "center") return "center" as const
    return "middleRight" as const
  }
  if (alignH === "left") return "bottomLeft" as const
  if (alignH === "center") return "bottomCenter" as const
  return "bottomRight" as const
}

export function LabelAlignmentGrid({
  disabled,
  onAlign,
  hideLabel,
}: LabelAlignmentGridProps) {
  const t = useTranslations("Design.inspector")
  const tAlign = useTranslations("Design.align")

  return (
    <div className="flex flex-col gap-1.5">
      {!hideLabel && (
        <Label className="text-[11px] font-normal text-muted-foreground">
          {t("textPosition")}
        </Label>
      )}
      <div
        className="grid grid-cols-3 gap-0.5"
        style={{ width: "fit-content" }}
      >
        {ALIGN_POSITIONS.map(({ alignH, alignV }) => (
          <button
            key={`${alignH}-${alignV}`}
            type="button"
            title={tAlign(alignTitleKey(alignH, alignV))}
            disabled={disabled}
            onClick={() => onAlign(alignH, alignV)}
            className={cn(
              "cursor-pointer",
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
