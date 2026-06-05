"use client"

import { EyeOff, Lock } from "lucide-react"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { MultiKeycapEditor } from "./keycap-inspector/MultiKeycapEditor"
import { SingleKeycapEditor } from "./keycap-inspector/SingleKeycapEditor"

export function KeycapInspectorSection() {
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
  if (noActiveLayer) disabledReason = "未选中图层"
  else if (isLayerLocked) disabledReason = "当前图层已锁定"
  else if (isLayerHidden) disabledReason = "当前图层已隐藏"

  if (selectedKeycapIds.length === 0) {
    return (
      <PanelSection title="键帽样式">
        <p className="py-1 text-center text-[11px] text-[var(--muted-foreground)]">
          未选中键帽
        </p>
      </PanelSection>
    )
  }

  if (selectedKeycapIds.length > 1) {
    return (
      <PanelSection title="键帽样式">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            已选中{" "}
            <span className="font-medium text-foreground">
              {selectedKeycapIds.length}
            </span>{" "}
            个键帽
          </span>
          <span className="text-[10px] text-muted-foreground/60">批量编辑</span>
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
      <PanelSection title="键帽样式">
        <p className="py-1 text-center text-[11px] text-[var(--muted-foreground)]">
          未选中键帽
        </p>
      </PanelSection>
    )
  }

  return (
    <PanelSection title="键帽样式">
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
