"use client"

import { useTranslations } from "next-intl"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { InfoRow } from "./keycap-inspector/InfoRow"

export function KeycapInfoSection() {
  const t = useTranslations("Design.inspector")
  const { keysById: KEYS_BY_ID } = useLayoutKeys()
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)

  if (selectedKeycapIds.length !== 1) return null

  const key = KEYS_BY_ID.get(selectedKeycapIds[0]!) ?? null
  if (!key) return null

  return (
    <PanelSection title={t("keycapInfo")} first collapsible defaultOpen={false}>
      <div className="flex flex-col gap-2">
        <InfoRow label={t("label")} value={key.label} />
        <InfoRow label="Key ID" value={key.keyId} />
        <InfoRow label={t("row")} value={key.rowLabel} />
        {key.rowLevel && <InfoRow label={t("rowLevel")} value={key.rowLevel} />}
        <div className="my-0.5 border-t border-border/40" />
        <InfoRow label={t("posX")} value={`${key.x}u`} />
        <InfoRow label={t("posY")} value={`${key.y}u`} />
        <InfoRow label={t("width")} value={`${key.w}u`} />
        <InfoRow label={t("height")} value={`${key.h}u`} />
        <InfoRow label={t("shape")} value={key.shape} />
      </div>
    </PanelSection>
  )
}
