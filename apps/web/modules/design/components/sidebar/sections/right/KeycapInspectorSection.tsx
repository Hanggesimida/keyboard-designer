"use client"

import { useTranslations } from "next-intl"
import { EyeOff, Lock } from "lucide-react"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { MultiKeycapEditor } from "./keycap-inspector/MultiKeycapEditor"
import { SingleKeycapEditor } from "./keycap-inspector/SingleKeycapEditor"

export function KeycapInspectorSection() {
  const t = useTranslations("Design.inspector")
  const { keysById: KEYS_BY_ID } = useLayoutKeys()
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)
  const layers = useDesignUIStore((s) => s.layers)
  const activeLayerId = useDesignUIStore((s) => s.activeLayerId)
  const layerKeycapOverrides = useDesignUIStore((s) => s.layerKeycapOverrides)

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? null
  const layerOverrides = activeLayerId
    ? (layerKeycapOverrides[activeLayerId] ?? {})
    : {}

  const isLayerLocked = activeLayer?.locked === true
  const isLayerHidden = activeLayer?.visible === false
  const noActiveLayer = !activeLayer
  const editorDisabled = noActiveLayer || isLayerLocked || isLayerHidden

  let disabledReason: string | null = null
  if (noActiveLayer) disabledReason = t("noLayer")
  else if (isLayerLocked) disabledReason = t("layerLocked")
  else if (isLayerHidden) disabledReason = t("layerHidden")

  if (selectedKeycapIds.length === 0) {
    return (
      <PanelSection title={t("keycapStyle")}>
        <p className="py-1 text-center text-[11px] text-muted-foreground">
          {t("noKeycap")}
        </p>
      </PanelSection>
    )
  }

  if (selectedKeycapIds.length > 1) {
    return (
      <PanelSection title={t("keycapStyle")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {t("selectedCount", { count: selectedKeycapIds.length })}
          </span>
          <span className="text-[10px] text-muted-foreground/60">{t("batchEdit")}</span>
        </div>

        {editorDisabled && disabledReason && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
            {isLayerLocked && <Lock className="size-3 shrink-0" />}
            {isLayerHidden && <EyeOff className="size-3 shrink-0" />}
            <span>{disabledReason}</span>
          </div>
        )}

        {activeLayerId && (
          <MultiKeycapEditor
            key={`multi:${activeLayerId}:${selectedKeycapIds.join(",")}`}
            selectedIds={selectedKeycapIds}
            layerId={activeLayerId}
            layerOverrides={layerOverrides}
            disabled={editorDisabled}
          />
        )}
      </PanelSection>
    )
  }

  const selectedKeycapId = selectedKeycapIds[0]!
  const override = activeLayerId
    ? (layerKeycapOverrides[activeLayerId]?.[selectedKeycapId] ?? undefined)
    : undefined
  const key = KEYS_BY_ID.get(selectedKeycapId) ?? null

  if (!key) {
    return (
      <PanelSection title={t("keycapStyle")}>
        <p className="py-1 text-center text-[11px] text-muted-foreground">
          {t("noKeycap")}
        </p>
      </PanelSection>
    )
  }

  return (
    <PanelSection title={t("keycapStyle")}>
      {editorDisabled && disabledReason && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          {isLayerLocked && <Lock className="size-3 shrink-0" />}
          {isLayerHidden && <EyeOff className="size-3 shrink-0" />}
          <span>{disabledReason}</span>
        </div>
      )}

      {activeLayerId && (
        <SingleKeycapEditor
          key={`${activeLayerId}:${key.keyId}`}
          keyDef={key}
          override={override}
          layerId={activeLayerId}
          disabled={editorDisabled}
        />
      )}
    </PanelSection>
  )
}
