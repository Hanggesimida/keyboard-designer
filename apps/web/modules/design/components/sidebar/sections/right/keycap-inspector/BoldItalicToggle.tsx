"use client"

import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface BoldItalicToggleProps {
  isBold: boolean
  isItalic: boolean
  fontCaps: { bold: boolean; italic: boolean }
  onToggleBold: () => void
  onToggleItalic: () => void
  disabled?: boolean
  boldMixed?: boolean
  italicMixed?: boolean
}

export function BoldItalicToggle({
  isBold,
  isItalic,
  fontCaps,
  onToggleBold,
  onToggleItalic,
  disabled,
  boldMixed,
  italicMixed,
}: BoldItalicToggleProps) {
  const t = useTranslations("Design.type")

  return (
    <div className="flex gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title={
          fontCaps.bold
            ? boldMixed
              ? t("mixedBold")
              : isBold
                ? t("unbold")
                : t("bold")
            : t("boldUnsupported")
        }
        disabled={disabled || !fontCaps.bold}
        className={cn(
          "text-xs font-bold",
          boldMixed && "border-chart-4 text-chart-4",
          !boldMixed && isBold && fontCaps.bold && "border-primary bg-primary/15 text-primary",
        )}
        onClick={onToggleBold}
      >
        B
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title={
          fontCaps.italic
            ? italicMixed
              ? t("mixedItalic")
              : isItalic
                ? t("unitalic")
                : t("italic")
            : t("italicUnsupported")
        }
        disabled={disabled || !fontCaps.italic}
        className={cn(
          "text-xs italic",
          italicMixed && "border-chart-4 text-chart-4",
          !italicMixed && isItalic && fontCaps.italic && "border-primary bg-primary/15 text-primary",
        )}
        onClick={onToggleItalic}
      >
        I
      </Button>
    </div>
  )
}
