"use client"

import { useState } from "react"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelChrome } from "./panel-chrome"
import { KeycapInfoSection } from "./sections/right/KeycapInfoSection"
import { GlobalKeycapSection } from "./sections/right/GlobalKeycapSection"
import { KeycapInspectorSection } from "./sections/right/KeycapInspectorSection"
import {
  InspectorScopeSwitcher,
  type InspectorScope,
} from "./sections/right/InspectorScopeSwitcher"

interface ScopePreference {
  selection: string[]
  scope: InspectorScope
}

export function DesignSidebarRight() {
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)
  const cancelKeycapStyleTransfer = useDesignUIStore(
    (s) => s.cancelKeycapStyleTransfer,
  )
  const [scopePreference, setScopePreference] =
    useState<ScopePreference | null>(null)

  const hasSelection = selectedKeycapIds.length > 0
  const scope: InspectorScope = !hasSelection
    ? "global"
    : scopePreference?.selection === selectedKeycapIds
      ? scopePreference.scope
      : "keycap"

  const handleScopeChange = (nextScope: InspectorScope) => {
    if (nextScope === "keycap" && !hasSelection) return
    if (nextScope === "global") cancelKeycapStyleTransfer()
    setScopePreference({ selection: selectedKeycapIds, scope: nextScope })
  }

  return (
    <PanelChrome side="right">
      <InspectorScopeSwitcher
        scope={scope}
        selectedCount={selectedKeycapIds.length}
        onScopeChange={handleScopeChange}
      />
      {scope === "global" ? (
        <GlobalKeycapSection />
      ) : (
        <>
          <KeycapInspectorSection />
          {selectedKeycapIds.length === 1 && <KeycapInfoSection />}
        </>
      )}
    </PanelChrome>
  )
}
