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

export const DEFAULT_FONT_WEIGHT = 400
export const DEFAULT_FONT_STYLE = "normal"
export const DEFAULT_LETTER_SPACING = 0
export const DEFAULT_LINE_HEIGHT_RATIO = 1.2

export function getMixedFontWeight(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
  globalFontWeight: number,
): MixedScalarField<number> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.fontWeight ?? globalFontWeight,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? globalFontWeight,
    isMixed: unique.length > 1,
  }
}

export function getMixedFontStyle(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
  globalFontStyle: string,
): MixedScalarField<string> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.fontStyle ?? globalFontStyle,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? globalFontStyle,
    isMixed: unique.length > 1,
  }
}

export function getMixedLetterSpacing(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
): MixedScalarField<number> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.letterSpacing ?? DEFAULT_LETTER_SPACING,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? DEFAULT_LETTER_SPACING,
    isMixed: unique.length > 1,
  }
}

export function getMixedLineHeightRatio(
  selectedIds: string[],
  layerOverrides: Record<string, KeycapOverride>,
): MixedScalarField<number> {
  const values = selectedIds.map(
    (id) => layerOverrides[id]?.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO,
  )
  const unique = [...new Set(values)]
  return {
    value: unique[0] ?? DEFAULT_LINE_HEIGHT_RATIO,
    isMixed: unique.length > 1,
  }
}
