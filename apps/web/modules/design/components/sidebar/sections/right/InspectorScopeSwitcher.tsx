"use client"

import type { ComponentType } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Keyboard, MousePointer2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type InspectorScope = "global" | "keycap"

interface InspectorScopeSwitcherProps {
  scope: InspectorScope
  selectedCount: number
  onScopeChange: (scope: InspectorScope) => void
}

function ScopeOption({
  selected,
  disabled,
  label,
  icon: Icon,
  expandOnSelect,
  onClick,
}: {
  selected: boolean
  disabled?: boolean
  label: string
  icon: ComponentType<{ className?: string }>
  expandOnSelect: boolean
  onClick: () => void
}) {
  const collapsed = expandOnSelect && !selected

  return (
    <Button
      type="button"
      variant={selected ? "default" : "ghost"}
      size="sm"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cn(
        "min-w-0 shadow-none",
        expandOnSelect &&
          "gap-0 overflow-hidden duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        expandOnSelect && (selected ? "flex-[1_1_0px] px-2.5" : "flex-[0_0_1.75rem] px-0"),
      )}
      onClick={onClick}
    >
      <Icon className="size-3.5 shrink-0" />
      {expandOnSelect ? (
        <span
          className={cn(
            "grid min-w-0 transition-[grid-template-columns,margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
            selected ? "ml-1 grid-cols-[1fr]" : "ml-0 grid-cols-[0fr]",
          )}
        >
          <span className="min-w-0 overflow-hidden">
            <span className="block whitespace-nowrap">{label}</span>
          </span>
        </span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Button>
  )
}

export function InspectorScopeSwitcher({
  scope,
  selectedCount,
  onScopeChange,
}: InspectorScopeSwitcherProps) {
  const t = useTranslations("Design.inspector")
  const locale = useLocale()
  const expandOnSelect = locale === "en"
  const hasSelection = selectedCount > 0
  const selectionLabel = hasSelection
    ? t("scopeSelectionCount", { count: selectedCount })
    : t("scopeSelection")

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-sidebar/95 px-3 pb-2.5 pt-3 backdrop-blur">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t("editScope")}
      </p>

      <div
        role="group"
        aria-label={t("editScope")}
        className={cn(
          "gap-1 rounded-lg border border-border bg-background/50 p-1",
          expandOnSelect ? "flex" : "grid grid-cols-2",
        )}
      >
        <ScopeOption
          selected={scope === "global"}
          label={t("scopeGlobal")}
          icon={Keyboard}
          expandOnSelect={expandOnSelect}
          onClick={() => onScopeChange("global")}
        />
        <ScopeOption
          selected={scope === "keycap"}
          disabled={!hasSelection}
          label={selectionLabel}
          icon={MousePointer2}
          expandOnSelect={expandOnSelect}
          onClick={() => onScopeChange("keycap")}
        />
      </div>
    </header>
  )
}
