"use client"

import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { InfoRow } from "./keycap-inspector/InfoRow"

export function KeycapInfoSection() {
  const { keysById: KEYS_BY_ID } = useLayoutKeys()
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)

  if (selectedKeycapIds.length !== 1) return null

  const key = KEYS_BY_ID.get(selectedKeycapIds[0]!) ?? null
  if (!key) return null

  return (
    <PanelSection title="键帽信息" collapsible defaultOpen={false}>
      <div className="flex flex-col gap-2">
        <InfoRow label="标签" value={key.label} />
        <InfoRow label="Key ID" value={key.keyId} />
        <InfoRow label="所属行" value={key.rowLabel} />
        {key.rowLevel && <InfoRow label="行级别" value={key.rowLevel} />}
        <div className="my-0.5 border-t border-border/40" />
        <InfoRow label="位置 X" value={`${key.x}u`} />
        <InfoRow label="位置 Y" value={`${key.y}u`} />
        <InfoRow label="宽度" value={`${key.w}u`} />
        <InfoRow label="高度" value={`${key.h}u`} />
        <InfoRow label="形状" value={key.shape} />
      </div>
    </PanelSection>
  )
}
