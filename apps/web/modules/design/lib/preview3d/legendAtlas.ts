/**
 * 整盘刻字图集：纯数据列表 + 世界采样矩阵；Canvas 烘焙在浏览器层。
 *
 * 坐标：键盘 SVG（与 DesignCanvas KeyboardTemplate 相同，不含 artPad）。
 * 世界矩阵：`uv = M * vec3(worldX, worldZ, 1)`，已按 Texture.flipY=true 翻转 V。
 */

import { toCssFontFamily } from "@/lib/fonts/fontRef"
import type { LayoutData } from "@/modules/design/data/layouts"
import { flattenLayout } from "@/modules/design/lib/design/layout"
import {
  computeKeycapLabelDrawOrigin,
  getKeycapTopFace,
} from "@/modules/design/lib/design/keycapLabelLayout"
import { KEY_LABEL_SIZE } from "@/modules/design/lib/design/keycapGeometry"
import {
  HEX_COLOR_FALLBACKS,
  resolveLayerKeycapFields,
  resolveSolidColor,
} from "@/modules/design/lib/design/resolveKeycapAppearance"
import {
  keyboardSvgSize,
  svgRectToWorldTextureMatrix,
} from "@/modules/design/lib/design/imageProjection"
import type {
  LegendAtlasSpec,
  LegendDrawItem,
  PreviewDesignStateInput,
} from "./types"

/** 整盘图集最长边。4096 让默认 7px 字约 23px 高，近看比 2048 明显锐一些。 */
export const LEGEND_ATLAS_MAX_SIDE = 4096

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}

/**
 * 解析 canvas `ctx.font` 可用的 family。
 * `var(--font-xxx)` → 文档根上的实际 next/font 值；用户字体 `uf:id` → `uf-id`。
 */
export function resolveCanvasFontFamily(ref: string): string {
  const css = toCssFontFamily(ref)
  const m = /^var\((--font-[^)]+)\)$/.exec(css.trim())
  if (m?.[1] && typeof document !== "undefined") {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue(m[1])
      .trim()
    if (val) return val
  }
  return css
}

export function atlasPixelSize(
  svgWidth: number,
  svgHeight: number,
  maxSide: number = LEGEND_ATLAS_MAX_SIDE,
): { width: number; height: number; scale: number } {
  const w = Math.max(svgWidth, 1)
  const h = Math.max(svgHeight, 1)
  const scale = Math.min(maxSide / w, maxSide / h)
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  }
}

function overrideRevision(
  overrides: PreviewDesignStateInput["layerKeycapOverrides"],
): string {
  return Object.entries(overrides)
    .map(([layerId, byKey]) => {
      const keysPart = Object.entries(byKey ?? {})
        .map(([keyId, o]) => {
          if (!o) return `${keyId}:`
          return [
            keyId,
            o.color ?? "",
            o.labelColor ?? "",
            o.labelText ?? "",
            o.fontSize ?? "",
            o.fontFamily ?? "",
            o.fontWeight ?? "",
            o.fontStyle ?? "",
            o.letterSpacing ?? "",
            o.lineHeightRatio ?? "",
            o.labelOffsetX ?? "",
            o.labelOffsetY ?? "",
          ].join(":")
        })
        .sort()
        .join(";")
      return `${layerId}>{${keysPart}}`
    })
    .sort()
    .join(",")
}

/**
 * layout + 设计快照 → 刻字绘制列表与世界矩阵。
 * 图层：可见且未 labelsHidden 的层自底向顶（与 2D 叠字一致）。
 */
export function buildLegendDrawList(
  layout: LayoutData,
  designState: PreviewDesignStateInput,
): LegendAtlasSpec {
  const flatKeys = flattenLayout(layout)
  const baseUnit =
    Number.isFinite(layout.baseUnit) && layout.baseUnit > 0
      ? layout.baseUnit
      : 54
  const { width: svgWidth, height: svgHeight } = keyboardSvgSize(
    flatKeys,
    baseUnit,
  )

  const g = designState.globalKeycapStyle
  const visibleLayers = designState.layers.filter((l) => l.visible !== false)
  const bottomToTop = [...visibleLayers].reverse()
  const items: LegendDrawItem[] = []

  for (const layer of bottomToTop) {
    if (layer.labelsHidden) continue
    const opacity = clamp01(layer.opacity)
    if (opacity <= 0) continue

    for (const key of flatKeys) {
      const override = designState.layerKeycapOverrides[layer.id]?.[key.keyId]
      const fields = resolveLayerKeycapFields({
        override,
        globalStyle: g,
        defaultLabel: key.label,
        labelsHidden: false,
        fallbacks: HEX_COLOR_FALLBACKS,
      })
      if (!fields.labelText) continue

      const fontSize = override?.fontSize ?? g.fontSize ?? KEY_LABEL_SIZE
      const fontFamily =
        override?.fontFamily ??
        designState.fontFamily ??
        "var(--font-ibm-plex-mono)"
      const fontWeight = override?.fontWeight ?? designState.fontWeight ?? 400
      const fontStyle = override?.fontStyle ?? designState.fontStyle ?? "normal"
      const letterSpacing = override?.letterSpacing ?? 0
      const lineHeightRatio = override?.lineHeightRatio ?? 1.2
      const top = getKeycapTopFace(key, baseUnit)
      const origin = computeKeycapLabelDrawOrigin({
        topX: top.x,
        topY: top.y,
        topW: top.w,
        topH: top.h,
        offsetX: override?.labelOffsetX ?? 0,
        offsetY: override?.labelOffsetY ?? 0,
        fontSize,
        lineHeightRatio,
        labelText: fields.labelText,
      })

      items.push({
        keyId: key.keyId,
        layerId: layer.id,
        lines: origin.lines,
        color: resolveSolidColor(fields.labelColor, HEX_COLOR_FALLBACKS.labelColor),
        opacity,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        letterSpacing,
        lineHeight: origin.lineHeight,
        textX: origin.textX,
        textYDraw: origin.textYDraw,
      })
    }
  }

  const matrixElements = svgRectToWorldTextureMatrix(
    0,
    0,
    svgWidth,
    svgHeight,
    baseUnit,
  )

  const layerRevision = designState.layers
    .map(
      (l) =>
        `${l.id}:${l.visible ? 1 : 0}:${l.opacity}:${l.labelsHidden ? 1 : 0}`,
    )
    .join(",")

  const revision = [
    layout.id,
    svgWidth,
    svgHeight,
    g.fontSize,
    g.labelColor,
    designState.fontFamily,
    designState.fontWeight,
    designState.fontStyle,
    layerRevision,
    overrideRevision(designState.layerKeycapOverrides),
    items.length,
  ].join("|")

  return { items, svgWidth, svgHeight, matrixElements, revision }
}

function drawCenteredLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
): void {
  const display = text || "\u00A0"
  if (letterSpacing === 0) {
    ctx.textAlign = "center"
    ctx.fillText(display, x, y)
    return
  }
  const chars = Array.from(display)
  const widths = chars.map((ch) => ctx.measureText(ch).width)
  let total = 0
  for (let i = 0; i < chars.length; i++) {
    total += widths[i] ?? 0
    if (i < chars.length - 1) total += letterSpacing
  }
  let cursor = x - total / 2
  ctx.textAlign = "left"
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i]!, cursor, y)
    cursor += (widths[i] ?? 0) + letterSpacing
  }
  ctx.textAlign = "center"
}

async function ensureFontsLoaded(
  items: readonly LegendDrawItem[],
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return
  await document.fonts.ready
  const seen = new Set<string>()
  const loads: Promise<unknown>[] = []
  for (const item of items) {
    const family = resolveCanvasFontFamily(item.fontFamily)
    const spec = `${item.fontStyle} ${item.fontWeight} ${item.fontSize}px ${family}`
    if (seen.has(spec)) continue
    seen.add(spec)
    loads.push(document.fonts.load(spec))
  }
  await Promise.all(loads)
}

/**
 * 将图集绘制到 canvas（调用方负责尺寸与纹理上传）。
 * 透明底；字色为不透明 fill，alpha 来自图层 opacity。
 */
export async function bakeLegendAtlas(
  canvas: HTMLCanvasElement,
  spec: LegendAtlasSpec,
): Promise<void> {
  const { width, height, scale } = atlasPixelSize(spec.svgWidth, spec.svgHeight)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)

  if (spec.items.length === 0) return

  await ensureFontsLoaded(spec.items)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.textBaseline = "middle"
  ctx.textAlign = "center"

  for (const item of spec.items) {
    const family = resolveCanvasFontFamily(item.fontFamily)
    ctx.globalAlpha = item.opacity
    ctx.fillStyle = item.color
    ctx.font = `${item.fontStyle} ${item.fontWeight} ${item.fontSize}px ${family}`
    item.lines.forEach((line, i) => {
      drawCenteredLine(
        ctx,
        line,
        item.textX,
        item.textYDraw + i * item.lineHeight,
        item.letterSpacing,
      )
    })
  }
  ctx.globalAlpha = 1
}
