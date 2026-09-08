/** 仅影响 3D 预览外壳主体与边框的材质预设。 */

export const CASE_MATERIAL_PRESETS = [
  {
    id: "anodizedAluminum",
    metalness: 0.88,
    roughness: 0.31,
    envMapIntensity: 1,
  },
  {
    id: "paintedMetal",
    metalness: 0.42,
    roughness: 0.46,
    envMapIntensity: 0.72,
  },
  {
    id: "mattePlastic",
    metalness: 0,
    roughness: 0.72,
    envMapIntensity: 0.25,
  },
  {
    id: "polishedMetal",
    metalness: 0.95,
    roughness: 0.14,
    envMapIntensity: 1.3,
  },
  {
    id: "ceramic",
    metalness: 0,
    roughness: 0.2,
    envMapIntensity: 0.9,
  },
] as const

export type CaseMaterialPreset = (typeof CASE_MATERIAL_PRESETS)[number]
export type CaseMaterialPresetId = CaseMaterialPreset["id"]

export const DEFAULT_CASE_MATERIAL_PRESET_ID: CaseMaterialPresetId =
  "anodizedAluminum"

const CASE_MATERIAL_PRESET_BY_ID = new Map<CaseMaterialPresetId, CaseMaterialPreset>(
  CASE_MATERIAL_PRESETS.map((preset) => [preset.id, preset]),
)

export function getCaseMaterialPreset(
  id: CaseMaterialPresetId,
): CaseMaterialPreset {
  return (
    CASE_MATERIAL_PRESET_BY_ID.get(id) ??
    CASE_MATERIAL_PRESET_BY_ID.get(DEFAULT_CASE_MATERIAL_PRESET_ID)!
  )
}
