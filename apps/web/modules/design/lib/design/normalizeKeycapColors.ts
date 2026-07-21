/**
 * 将遗留的 bgColor / topColor 收敛为单一 color。
 * 合并规则：color ?? topColor ?? bgColor ?? fallback（优先顶面色）。
 */

import { DEFAULT_KEYCAP_COLORS } from "@/modules/design/lib/designDefaults"
import type {
  GlobalKeycapStyle,
  KeycapOverride,
  LayerKeycapOverrides,
} from "@/modules/design/store/designUiStore"

/** 可能含旧字段的颜色来源 */
type LegacyColorFields = {
  color?: string
  topColor?: string
  bgColor?: string
}

export function resolveKeycapColor(
  source: LegacyColorFields | null | undefined,
  fallback: string = DEFAULT_KEYCAP_COLORS.color,
): string {
  if (!source) return fallback
  return source.color ?? source.topColor ?? source.bgColor ?? fallback
}

/** 归一化全局键帽样式，去掉 bgColor / topColor */
export function normalizeGlobalKeycapStyle(
  style: (Partial<GlobalKeycapStyle> & LegacyColorFields) | null | undefined,
): GlobalKeycapStyle {
  const s = style ?? {}
  return {
    fontSize: typeof s.fontSize === "number" ? s.fontSize : 7,
    labelColor:
      typeof s.labelColor === "string"
        ? s.labelColor
        : DEFAULT_KEYCAP_COLORS.labelColor,
    color: resolveKeycapColor(s),
    borderColor:
      typeof s.borderColor === "string"
        ? s.borderColor
        : DEFAULT_KEYCAP_COLORS.borderColor,
    borderHidden: Boolean(s.borderHidden),
  }
}

/** 归一化单键 override；无颜色字段时不写入 color */
export function normalizeKeycapOverride(
  override: (KeycapOverride & LegacyColorFields) | null | undefined,
): KeycapOverride {
  if (!override) return {}
  const { bgColor, topColor, color: existing, ...rest } = override
  const cleaned: KeycapOverride = { ...rest }
  if (existing != null || topColor != null || bgColor != null) {
    cleaned.color = existing ?? topColor ?? bgColor
  }
  return cleaned
}

export function normalizeLayerKeycapOverrides(
  overrides: LayerKeycapOverrides | null | undefined,
): LayerKeycapOverrides {
  if (!overrides) return {}
  const next: LayerKeycapOverrides = {}
  for (const [layerId, keyMap] of Object.entries(overrides)) {
    const nextMap: Record<string, KeycapOverride> = {}
    for (const [keyId, ov] of Object.entries(keyMap ?? {})) {
      nextMap[keyId] = normalizeKeycapOverride(
        ov as KeycapOverride & LegacyColorFields,
      )
    }
    next[layerId] = nextMap
  }
  return next
}

/** 归一化设计 payload 中的颜色字段（加载 / 导入 / 保存共用） */
export function normalizeDesignColorFields<
  T extends {
    globalKeycapStyle: GlobalKeycapStyle | (Partial<GlobalKeycapStyle> & LegacyColorFields)
    layerKeycapOverrides: LayerKeycapOverrides
  },
>(data: T): T {
  return {
    ...data,
    globalKeycapStyle: normalizeGlobalKeycapStyle(
      data.globalKeycapStyle as Partial<GlobalKeycapStyle> & LegacyColorFields,
    ),
    layerKeycapOverrides: normalizeLayerKeycapOverrides(
      data.layerKeycapOverrides,
    ),
  }
}
