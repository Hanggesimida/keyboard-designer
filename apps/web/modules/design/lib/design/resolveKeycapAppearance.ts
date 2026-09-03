/**
 * 键帽外观解析（2D / 3D 共用单层字段优先级；3D 再做多层纯色合成）。
 *
 * ## 图层语义（Phase 3 约定）
 *
 * - **图层顺序**：`layers[]` 中 index 0 为视觉最顶层；合成时从数组末尾扫到开头（底→顶）。
 * - **单层字段**：`override.field ?? global.field ?? default`（与 KeycapNode 一致）。
 * - **opacity**：整层 alpha，作用于该层贡献的颜色（等价 2D `<g opacity>`），
 *   不是「只作用于当前有 override 的属性」。
 * - **visible=false**：该层不参与合成；若无任何可见层 → `visible: false`（整键不画）。
 * - **labelsHidden**：图层级。3D 刻字图集按层绘制（可见且未隐藏的层自底向顶）；
 *   `resolveKeycapAppearance` 仍取最顶可见层，供 PreviewKey 摘要。
 * - **键帽底色渐变**：全局 `color` 可为 CSS 渐变（整盘分配意图）；渲染时按键中心在
 *   布局上沿渐变方向投影采样为纯色。单键 override 若仍为渐变则降为 50% 中点纯色。
 *   键帽本体 fill 始终为纯色（文字色 / 边框色仍可用 resolveSolidColor 中点降级）。
 * - **图片**：由独立的 imageProjection 图集合成链路进入 3D，不在外观解析中处理。
 * - **border**：解析可算；3D mesh 不消费。
 */

import { colord } from "colord"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import { DEFAULT_KEYCAP_COLORS } from "@/modules/design/lib/designDefaults"
import {
  isGradientValue,
  parseCssLinearGradient,
  interpolateGradientColor,
} from "@/modules/design/lib/design/gradientUtils"
import {
  distributeGradientColors,
  type KeyCenter,
} from "@/modules/design/lib/design/distributeGradientColors"
import type {
  GlobalKeycapStyle,
  KeycapOverride,
} from "@/modules/design/store/designUiStore"

/** 解析用图层快照（与 store Layer 对齐的最小子集） */
export interface AppearanceLayerInput {
  id: string
  visible: boolean
  opacity: number
  labelsHidden?: boolean
}

export interface ColorFallbacks {
  color: string
  labelColor: string
  borderColor: string
}

/** 2D 画布可用 CSS 变量作 fallback；3D 用 hex 默认值 */
export const CSS_VAR_COLOR_FALLBACKS: ColorFallbacks = {
  color: "var(--design-keycap-fill)",
  labelColor: "var(--design-keycap-label)",
  borderColor: "var(--design-keycap-stroke)",
}

export const HEX_COLOR_FALLBACKS: ColorFallbacks = {
  color: DEFAULT_KEYCAP_COLORS.color,
  labelColor: DEFAULT_KEYCAP_COLORS.labelColor,
  borderColor: DEFAULT_KEYCAP_COLORS.borderColor,
}

/** 单层解析结果；label/border 仍可为渐变字符串；color 经 resolveKeycapBodyColor 后应为纯色 */
export interface LayerKeycapFields {
  color: string
  labelColor: string
  labelText: string
  borderColor: string
  borderHidden: boolean
  labelsHidden: boolean
}

/** 多层合成后的最终外观（颜色均为纯色 hex，供 3D） */
export interface ResolvedKeycapAppearance {
  color: string
  labelColor: string
  labelText: string
  borderColor: string
  borderHidden: boolean
  labelsHidden: boolean
  visible: boolean
}

/**
 * 将设计色降级为纯色 hex。
 * 渐变取 50% 位置插值；无法解析时回退 fallback。
 */
export function resolveSolidColor(
  value: string | undefined,
  fallback: string,
): string {
  if (!value || value.trim() === "") return preserveOrHex(fallback, fallback)
  if (isGradientValue(value)) {
    const parsed = parseCssLinearGradient(value)
    if (!parsed) return preserveOrHex(fallback, fallback)
    return ensureHex(interpolateGradientColor(parsed, 50), fallback)
  }
  return preserveOrHex(value, fallback)
}

/** 全局渐变时预计算 keyId → 纯色；非渐变返回 undefined。 */
export function buildGlobalDistributedColors(
  globalColor: string | undefined,
  keyCenters: ReadonlyArray<KeyCenter>,
): Record<string, string> | undefined {
  if (!globalColor || !isGradientValue(globalColor) || keyCenters.length === 0) {
    return undefined
  }
  return distributeGradientColors(globalColor, keyCenters)
}

export interface ResolveKeycapBodyColorInput {
  overrideColor?: string
  globalColor?: string
  keyId: string
  /** 由 buildGlobalDistributedColors 预计算；全局为渐变时按键采样 */
  globalDistributedColors?: Readonly<Record<string, string>>
  fallback?: string
}

/**
 * 解析键帽本体底色，始终倾向纯色。
 * - override 纯色 → 用之
 * - override 渐变 → 50% 中点（兼容旧单键渐变数据）
 * - 无 override，全局纯色 → 用之
 * - 无 override，全局渐变 → 用整盘投影采样色
 */
export function resolveKeycapBodyColor(
  input: ResolveKeycapBodyColorInput,
): string {
  const fallback = input.fallback ?? DEFAULT_KEYCAP_COLORS.color
  const overrideColor = input.overrideColor

  if (overrideColor != null && overrideColor.trim() !== "") {
    return resolveSolidColor(overrideColor, fallback)
  }

  const globalColor = input.globalColor
  if (globalColor != null && globalColor.trim() !== "") {
    if (isGradientValue(globalColor)) {
      const sampled = input.globalDistributedColors?.[input.keyId]
      if (sampled) return ensureHex(sampled, fallback)
      return resolveSolidColor(globalColor, fallback)
    }
    return preserveOrHex(globalColor, fallback)
  }

  return preserveOrHex(fallback, fallback)
}

function ensureHex(
  value: string,
  fallback: string = DEFAULT_KEYCAP_COLORS.color,
): string {
  if (colord(value).isValid()) return colord(value).toHex()
  if (colord(fallback).isValid()) return colord(fallback).toHex()
  return DEFAULT_KEYCAP_COLORS.color
}

/** hex 则规范化；CSS 变量等无效色则原样返回（2D fallback）。 */
function preserveOrHex(value: string, fallback: string): string {
  if (colord(value).isValid()) return colord(value).toHex()
  if (value.trim() !== "") return value
  if (colord(fallback).isValid()) return colord(fallback).toHex()
  return fallback
}

/** 不透明色 source-over：out = src * a + dst * (1 - a) */
function mixSolid(dstHex: string, srcHex: string, amount: number): string {
  const t = clamp01(amount)
  const a = colord(dstHex).toRgb()
  const b = colord(srcHex).toRgb()
  return colord({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }).toHex()
}

export interface ResolveLayerKeycapFieldsInput {
  override?: Pick<
    KeycapOverride,
    | "color"
    | "labelColor"
    | "labelText"
    | "borderColor"
    | "borderHidden"
  >
  globalStyle?: Pick<
    GlobalKeycapStyle,
    "color" | "labelColor" | "borderColor" | "borderHidden"
  >
  defaultLabel: string
  /** 图层级 labelsHidden */
  labelsHidden?: boolean
  /** 缺省色；2D 用 CSS 变量，3D 用 hex */
  fallbacks?: ColorFallbacks
}

/**
 * 单层字段解析（底色仍可能为渐变字符串；调用方应对 color 使用 resolveKeycapBodyColor）。
 * 2D KeycapNode 与 3D 合成路径共用优先级链。
 */
export function resolveLayerKeycapFields(
  input: ResolveLayerKeycapFieldsInput,
): LayerKeycapFields {
  const fb = input.fallbacks ?? CSS_VAR_COLOR_FALLBACKS
  const override = input.override
  const globalStyle = input.globalStyle

  return {
    color: override?.color ?? globalStyle?.color ?? fb.color,
    labelColor: override?.labelColor ?? globalStyle?.labelColor ?? fb.labelColor,
    labelText: override?.labelText ?? input.defaultLabel,
    borderColor:
      override?.borderColor ?? globalStyle?.borderColor ?? fb.borderColor,
    borderHidden: resolveEffectiveBorderHidden(
      override as KeycapOverride | undefined,
      globalStyle as GlobalKeycapStyle | undefined,
    ),
    labelsHidden: input.labelsHidden === true,
  }
}

export interface ResolveKeycapAppearanceInput {
  globalStyle: Pick<
    GlobalKeycapStyle,
    "color" | "labelColor" | "borderColor" | "borderHidden"
  >
  layers: ReadonlyArray<AppearanceLayerInput>
  layerOverrides: Readonly<
    Record<string, Record<string, KeycapOverride | undefined> | undefined>
  >
  keyId: string
  defaultLabel: string
  /** 全局键帽色为渐变时，由 buildGlobalDistributedColors 预计算 */
  globalDistributedColors?: Readonly<Record<string, string>>
}

/**
 * 可见图层自底向顶纯色 alpha 合成，得到 3D 可用的最终外观。
 * 不把 selected 混进设计色。
 */
export function resolveKeycapAppearance(
  input: ResolveKeycapAppearanceInput,
): ResolvedKeycapAppearance {
  const visibleLayers = input.layers.filter((l) => l.visible !== false)
  const bodyColorOpts = {
    globalColor: input.globalStyle.color,
    keyId: input.keyId,
    globalDistributedColors: input.globalDistributedColors,
    fallback: HEX_COLOR_FALLBACKS.color,
  }

  if (visibleLayers.length === 0) {
    const empty = resolveLayerKeycapFields({
      globalStyle: input.globalStyle,
      defaultLabel: input.defaultLabel,
      fallbacks: HEX_COLOR_FALLBACKS,
    })
    return {
      color: resolveKeycapBodyColor({
        ...bodyColorOpts,
        overrideColor: undefined,
      }),
      labelColor: resolveSolidColor(
        empty.labelColor,
        HEX_COLOR_FALLBACKS.labelColor,
      ),
      labelText: empty.labelText,
      borderColor: resolveSolidColor(
        empty.borderColor,
        HEX_COLOR_FALLBACKS.borderColor,
      ),
      borderHidden: empty.borderHidden,
      labelsHidden: empty.labelsHidden,
      visible: false,
    }
  }

  // 底→顶：数组末尾先合成
  const bottomToTop = [...visibleLayers].reverse()
  let compositedColor: string | null = null

  for (const layer of bottomToTop) {
    const override = input.layerOverrides[layer.id]?.[input.keyId]
    const solid = resolveKeycapBodyColor({
      ...bodyColorOpts,
      overrideColor: override?.color,
    })

    if (compositedColor === null) {
      // 最底层：不透明 mesh 以该层纯色为基底；其 opacity 在仅有一层时无法表现
      // 半透明透出底板，上层叠加时由后续 mix(dst, src, opacity) 体现。
      compositedColor = solid
    } else {
      const opacity = clamp01(layer.opacity)
      compositedColor = mixSolid(compositedColor, solid, opacity)
    }
  }

  // 标签 / border 取最顶可见层（visibleLayers[0] === layers 顶）
  const topLayer = visibleLayers[0]!
  const topFields = resolveLayerKeycapFields({
    override: input.layerOverrides[topLayer.id]?.[input.keyId],
    globalStyle: input.globalStyle,
    defaultLabel: input.defaultLabel,
    labelsHidden: topLayer.labelsHidden,
    fallbacks: HEX_COLOR_FALLBACKS,
  })

  return {
    color: compositedColor ?? HEX_COLOR_FALLBACKS.color,
    labelColor: resolveSolidColor(
      topFields.labelColor,
      HEX_COLOR_FALLBACKS.labelColor,
    ),
    labelText: topFields.labelText,
    borderColor: resolveSolidColor(
      topFields.borderColor,
      HEX_COLOR_FALLBACKS.borderColor,
    ),
    borderHidden: topFields.borderHidden,
    labelsHidden: topFields.labelsHidden,
    visible: true,
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}
