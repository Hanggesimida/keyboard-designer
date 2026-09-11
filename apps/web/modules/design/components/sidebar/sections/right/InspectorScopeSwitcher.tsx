"use client"

import { useTranslations } from "next-intl"
import { Keyboard, MousePointer2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export type InspectorScope = "global" | "keycap"

interface InspectorScopeSwitcherProps {
  scope: InspectorScope
  selectedCount: number
  onScopeChange: (scope: InspectorScope) => void
}

export function InspectorScopeSwitcher({
  scope,
  selectedCount,
  onScopeChange,
}: InspectorScopeSwitcherProps) {
  const t = useTranslations("Design.inspector")
  const hasSelection = selectedCount > 0

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-sidebar/95 px-3 pb-2.5 pt-3 backdrop-blur">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t("editScope")}
      </p>

      <div
        role="group"
        aria-label={t("editScope")}
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/50 p-1"
      >
        <Button
          type="button"
          variant={scope === "global" ? "default" : "ghost"}
          size="sm"
          aria-pressed={scope === "global"}
          className="min-w-0 shadow-none"
          onClick={() => onScopeChange("global")}
        >
          <Keyboard className="size-3.5" />
          <span className="truncate">{t("scopeGlobal")}</span>
        </Button>
        <Button
          type="button"
          variant={scope === "keycap" ? "default" : "ghost"}
          size="sm"
          disabled={!hasSelection}
          aria-pressed={scope === "keycap"}
          className="min-w-0 shadow-none"
          onClick={() => onScopeChange("keycap")}
        >
          <MousePointer2 className="size-3.5" />
          <span className="truncate">
            {hasSelection
              ? t("scopeSelectionCount", { count: selectedCount })
              : t("scopeSelection")}
          </span>
        </Button>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        {scope === "global"
          ? t("editingGlobalHint")
          : t("editingSelectionHint", { count: selectedCount })}
      </p>
    </header>
  )
}
