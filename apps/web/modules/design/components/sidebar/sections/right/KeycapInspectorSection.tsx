"use client"

import { useTranslations } from "next-intl"
import { EyeOff, Lock, Paintbrush, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
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
  const keycapStyleTransferRequest = useDesignUIStore(
    (s) => s.keycapStyleTransferRequest,
  )
  const beginKeycapStyleTransfer = useDesignUIStore(
    (s) => s.beginKeycapStyleTransfer,
  )
  const cancelKeycapStyleTransfer = useDesignUIStore(
    (s) => s.cancelKeycapStyleTransfer,
  )

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

  const styleTransferControls = activeLayerId ? (
    keycapStyleTransferRequest ? (
      <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2">
        <Paintbrush className="size-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 text-[11px] text-foreground">
          {t("pickStyleSource")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 cursor-pointer"
          title={t("cancelReuseStyle")}
          onClick={cancelKeycapStyleTransfer}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={editorDisabled}
        className="w-full cursor-pointer"
        onClick={() =>
          beginKeycapStyleTransfer({
            targetLayerId: activeLayerId,
            targetKeycapIds: selectedKeycapIds,
          })
        }
      >
        <Paintbrush className="size-3.5" />
        {t("reuseStyle")}
      </Button>
    )
  ) : null

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
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {t("selectedCount", { count: selectedKeycapIds.length })}
            </span>
            <span className="text-[10px] text-muted-foreground/60">{t("batchEdit")}</span>
          </div>

          {editorDisabled && disabledReason && (
            <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
              {isLayerLocked && <Lock className="size-3 shrink-0" />}
              {isLayerHidden && <EyeOff className="size-3 shrink-0" />}
              <span>{disabledReason}</span>
            </div>
          )}

          {styleTransferControls}

          {activeLayerId && (
            <MultiKeycapEditor
              key={`multi:${activeLayerId}:${selectedKeycapIds.join(",")}`}
              selectedIds={selectedKeycapIds}
              layerId={activeLayerId}
              layerOverrides={layerOverrides}
              disabled={editorDisabled || !!keycapStyleTransferRequest}
            />
          )}
        </div>
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
      <div className="flex flex-col gap-2">
        {editorDisabled && disabledReason && (
          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
            {isLayerLocked && <Lock className="size-3 shrink-0" />}
            {isLayerHidden && <EyeOff className="size-3 shrink-0" />}
            <span>{disabledReason}</span>
          </div>
        )}

        {styleTransferControls}

        {activeLayerId && (
          <SingleKeycapEditor
            key={`${activeLayerId}:${key.keyId}`}
            keyDef={key}
            override={override}
            layerId={activeLayerId}
            disabled={editorDisabled || !!keycapStyleTransferRequest}
          />
        )}
      </div>
    </PanelSection>
  )
}
