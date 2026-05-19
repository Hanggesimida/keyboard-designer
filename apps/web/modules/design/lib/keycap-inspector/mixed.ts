import type { GlobalKeycapStyle, KeycapOverride } from "@/modules/design/store/designUiStore"

export interface MixedScalarField<T> {
  value: T
  isMixed: boolean
}

export interface MixedColorField {
  value: string
  isMixed: boolean
}

export type ColorStyleKey = "labelColor" | "topColor" | "bgColor" | "borderColor"

export function getMixedColorField(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
  globalStyle: GlobalKeycapStyle,
  overrideKey: keyof Pick<KeycapOverride, ColorStyleKey>,
  globalKey: ColorStyleKey,
): MixedColorField {
  const fallback = globalStyle[globalKey]
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.[overrideKey] ?? fallback,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? fallback,
    isMixed: unique.length > 1,
  }
}

export function getMixedFontSize(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
  globalStyle: GlobalKeycapStyle,
): MixedScalarField<number> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.fontSize ?? globalStyle.fontSize,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? globalStyle.fontSize,
    isMixed: unique.length > 1,
  }
}

export function getMixedFontFamily(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
  globalFontFamily: string,
): MixedScalarField<string> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.fontFamily ?? globalFontFamily,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? globalFontFamily,
    isMixed: unique.length > 1,
  }
}
