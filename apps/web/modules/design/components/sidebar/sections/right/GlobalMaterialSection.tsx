"use client"

import { useTranslations } from "next-intl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import {
  MATERIAL_PRESETS,
  type MaterialPresetId,
  type MaterialSettings,
} from "@/modules/design/lib/design/materials"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"

type MaterialParameter = "roughness" | "metalness" | "transparency"

interface MaterialEditorProps {
  label: string
  material: MaterialSettings
  onPresetChange: (preset: MaterialPresetId) => void
  onParameterChange: (patch: Partial<Record<MaterialParameter, number>>) => void
}

function MaterialEditor({
  label,
  material,
  onPresetChange,
  onParameterChange,
}: MaterialEditorProps) {
  const t = useTranslations("Design.inspector")
  const parameters: MaterialParameter[] = [
    "roughness",
    "metalness",
    "transparency",
  ]

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[11px] font-medium text-sidebar-foreground">
        {label}
      </Label>
      <Select
        value={material.presetId}
        onValueChange={(value) => {
          if (typeof value === "string") {
            onPresetChange(value as MaterialPresetId)
          }
        }}
      >
        <SelectTrigger size="sm" className="h-8 w-full text-xs shadow-none">
          <SelectValue>
            {t(`materials.${material.presetId}`)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MATERIAL_PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {t(`materials.${preset.id}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col gap-1.5">
        {parameters.map((parameter) => {
          const percentage = Math.round(material[parameter] * 100)
          return (
            <div
              key={parameter}
              className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span>{t(parameter)}</span>
              <Slider
                value={[percentage]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value
                  if (typeof next !== "number") return
                  onParameterChange({
                    [parameter]: next / 100,
                  })
                }}
              />
              <span className="text-right tabular-nums">{percentage}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GlobalMaterialSection() {
  const t = useTranslations("Design.inspector")
  const caseMaterial = useDesignUIStore((state) => state.caseMaterial)
  const keycapMaterial = useDesignUIStore((state) => state.keycapMaterial)
  const setCaseMaterialPreset = useDesignUIStore(
    (state) => state.setCaseMaterialPreset,
  )
  const updateCaseMaterial = useDesignUIStore(
    (state) => state.updateCaseMaterial,
  )
  const setKeycapMaterialPreset = useDesignUIStore(
    (state) => state.setKeycapMaterialPreset,
  )
  const updateKeycapMaterial = useDesignUIStore(
    (state) => state.updateKeycapMaterial,
  )

  return (
    <PanelSection title={t("materialTitle")} collapsible>
      <div className="flex flex-col gap-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("materialHint")}
        </p>
        <MaterialEditor
          label={t("caseMaterial")}
          material={caseMaterial}
          onPresetChange={setCaseMaterialPreset}
          onParameterChange={updateCaseMaterial}
        />
        <MaterialEditor
          label={t("keycapMaterial")}
          material={keycapMaterial}
          onPresetChange={setKeycapMaterialPreset}
          onParameterChange={updateKeycapMaterial}
        />
      </div>
    </PanelSection>
  )
}
