export const MATERIAL_PRESETS = [
  {
    id: "metal",
    roughness: 0.28,
    metalness: 0.9,
    transparency: 0,
  },
  {
    id: "mattePlastic",
    roughness: 0.72,
    metalness: 0,
    transparency: 0,
  },
  {
    id: "translucentPlastic",
    roughness: 0.32,
    metalness: 0,
    transparency: 0.62,
  },
  {
    id: "glass",
    roughness: 0.06,
    metalness: 0,
    transparency: 0.92,
  },
  {
    id: "ceramic",
    roughness: 0.22,
    metalness: 0,
    transparency: 0,
  },
  {
    id: "wood",
    roughness: 0.58,
    metalness: 0,
    transparency: 0,
    textureId: "wood-grain",
  },
] as const

export type MaterialPreset = (typeof MATERIAL_PRESETS)[number]
export type MaterialPresetId = MaterialPreset["id"]
export type MaterialTextureId = NonNullable<
  Extract<MaterialPreset, { textureId: string }>["textureId"]
>

export interface MaterialSettings {
  presetId: MaterialPresetId
  roughness: number
  metalness: number
  /** 0 = 不透明，1 = 完全透射。 */
  transparency: number
}

export const DEFAULT_CASE_MATERIAL_ID: MaterialPresetId = "metal"
export const DEFAULT_KEYCAP_MATERIAL_ID: MaterialPresetId = "mattePlastic"

const PRESET_BY_ID = new Map<MaterialPresetId, MaterialPreset>(
  MATERIAL_PRESETS.map((preset) => [preset.id, preset]),
)

export function isMaterialPresetId(value: unknown): value is MaterialPresetId {
  return (
    typeof value === "string" &&
    PRESET_BY_ID.has(value as MaterialPresetId)
  )
}

export function getMaterialPreset(id: MaterialPresetId): MaterialPreset {
  return PRESET_BY_ID.get(id)!
}

/** 釉面与玻璃的固定光学参数；粗糙度滑块不覆盖这层清漆。 */
export function materialSurfaceFinish(presetId: MaterialPresetId): {
  clearcoat: number
  clearcoatRoughness: number
  ior: number
} {
  if (presetId === "ceramic") {
    return { clearcoat: 0.9, clearcoatRoughness: 0.12, ior: 1.5 }
  }
  if (presetId === "glass") {
    return { clearcoat: 0.12, clearcoatRoughness: 0.08, ior: 1.52 }
  }
  return { clearcoat: 0, clearcoatRoughness: 0.08, ior: 1.47 }
}

export function createMaterialSettings(
  presetId: MaterialPresetId,
): MaterialSettings {
  const preset = getMaterialPreset(presetId)
  return {
    presetId,
    roughness: preset.roughness,
    metalness: preset.metalness,
    transparency: preset.transparency,
  }
}

export function clampMaterialParameter(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function readParameter(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clampMaterialParameter(value)
    : fallback
}

/** 兼容缺少材质字段的历史设计，并拒绝未知预设及非法参数。 */
export function normalizeMaterialSettings(
  value: unknown,
  fallbackPresetId: MaterialPresetId,
): MaterialSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return createMaterialSettings(fallbackPresetId)
  }

  const input = value as Record<string, unknown>
  const presetId = isMaterialPresetId(input["presetId"])
    ? input["presetId"]
    : fallbackPresetId
  const defaults = createMaterialSettings(presetId)
  return {
    presetId,
    roughness: readParameter(input["roughness"], defaults.roughness),
    metalness: readParameter(input["metalness"], defaults.metalness),
    transparency: readParameter(
      input["transparency"],
      defaults.transparency,
    ),
  }
}
