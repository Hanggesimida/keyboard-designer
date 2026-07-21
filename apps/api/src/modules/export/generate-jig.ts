/**
 * 治具 SVG 生成核心逻辑
 *
 * 主要差异（相对旧 Python 脚本）：
 *   - 字体转曲（opentype.js <path>）；无字体文件时保留 <text>
 *   - 数据文件通过 fs 读取（服务端 Node.js）
 */

import fs from 'fs';
import { resolveFontFamily } from './font-assets';
import {
  canOutlineFont,
  textDescriptorsToPathResults,
  type TextDescriptor,
  type UserFontAssetMap,
} from './font-to-path';
import { toCssFontFamily, isUserFontRef } from './font-ref';
import {
  type JigPosition,
  type LayoutKey,
  type JigShape,
  isJigRotated,
  mapCanvasImageToJig,
  pointsBBox,
  pushClipPathDef,
  renderShape,
  resolveBottomFace,
  resolveBaseBox,
  resolveGlobalClipShape,
  resolvePerKeyClipShape,
  resolveTopFace,
  resolveTopFaceMappingRect,
} from './jig-geometry';
import {
  decodeSvgSrc,
  ensureSvgSymbol,
  ensureXlinkNamespace,
  injectIntoDefs,
  injectLayers,
  isSvgDataUrl,
} from './svg-inline';
import { getTopFaceRects } from './keycap-geometry';
import { resolveDesignDataPath } from './asset-paths';

// ─── 几何常量（与 keycapGeometry.ts 保持同步）───────────────────────────────
const KEYCAP_GAP = 2
const KEY_PAD_LEFT = 11
const KEY_PAD_RIGHT = 11
const KEY_LABEL_SIZE = 7
const KEY_LABEL_OPTICAL_CENTER_RATIO = 0.09
const ART_PAD = 28

// ─── 类型定义 ─────────────────────────────────────────────────────────────

interface GlobalKeycapStyle {
  /** 整颗键帽本体色；兼容旧稿 bgColor / topColor */
  color?: string
  bgColor?: string
  topColor?: string
  fontSize?: number
  labelColor?: string
  [key: string]: unknown
}

interface KeycapOverride {
  color?: string
  bgColor?: string
  topColor?: string
  labelText?: string
  labelColor?: string
  fontSize?: number
  fontFamily?: string
  letterSpacing?: number
  lineHeightRatio?: number
  labelOffsetX?: number
  labelOffsetY?: number
  borderColor?: string
  borderHidden?: boolean
}

interface CanvasElement {
  type: string
  id: string
  x: number
  y: number
  width: number
  height: number
  src?: string
  opacity?: number
  rotation?: number
  clipToKeycapId?: string
  clipToKeycapIds?: string[]
  clipToTopFace?: boolean
  clipToKeycaps?: boolean
  [key: string]: unknown
}

interface DesignLayer {
  id: string
  labelsHidden?: boolean
  [key: string]: unknown
}

/** 与 exportArtboardJson 导出格式完全一致 */
export interface DesignPayload {
  version?: number
  templateId: string
  artboardBackground?: string
  fontFamily?: string
  globalKeycapStyle?: GlobalKeycapStyle
  layers?: DesignLayer[]
  layerKeycapOverrides?: Record<string, Record<string, KeycapOverride>>
  canvasElements?: CanvasElement[]
}

interface ParsedDesign {
  globalColor: string
  globalFontSize: number
  globalLabelColor: string
  globalFontFamily: string
  overrides: Record<string, KeycapOverride>
  templateId: string
  canvasElements: CanvasElement[]
}

interface Layout {
  keys: Record<string, LayoutKey>
  baseUnit: number
}

interface JigLookupParams {
  baseId: string
  unit?: number
  rowLevel?: string
  shape?: string
  geometryGroup?: string
  isAnonymous?: boolean
}

interface JigRenderContext {
  positions: JigPosition[]
  templateKeys: Record<string, LayoutKey>
  assignment: Map<JigPosition, string>
  posByKey: Map<string, JigPosition>
  baseUnit: number
  topScale: number
}

interface KeyStyle {
  color: string
  labelText: string
  labelColor: string
  fontSize: number
  fontFamily: string
  letterSpacing: number
  lineHeightRatio: number
  labelOffsetX: number
  labelOffsetY: number
}

interface DesignLayersIntermediate {
  colorLayer: string
  textDescriptors: TextDescriptor[]
  textExtraAttrs: Record<string, string>
  fallbackTexts: string[]
  textRotations: Map<string, { cx: number; cy: number; angle: number }>
}

interface ImageLayerResult {
  layerSvg: string
  defsContent: string
}

// ─── 增补键 ID 解码与治具分配 ─────────────────────────────────────────────

function resolveJigLookup(keyId: string): JigLookupParams {
  const isoMatch = keyId.match(/^(.+)_ISO$/)
  if (isoMatch?.[1]) return { baseId: isoMatch[1], geometryGroup: `${keyId}_1` }
  if (keyId.endsWith("_STEP")) return { baseId: keyId.slice(0, -5), shape: "stepped" }
  if (keyId.startsWith("KC_CUST_")) {
    const rowMatch = keyId.match(/_R(\d)/)
    return { baseId: "", rowLevel: rowMatch ? `R${rowMatch[1]}` : undefined, isAnonymous: true }
  }

  const unitFrac = keyId.match(/_(\d{3})$/)
  if (unitFrac?.[0] && unitFrac[1]) {
    return {
      baseId: keyId.slice(0, keyId.length - unitFrac[0].length),
      unit: parseInt(unitFrac[1]) / 100,
    }
  }

  const unitInt = keyId.match(/_(\d+)U$/)
  if (unitInt?.[0] && unitInt[1]) {
    return {
      baseId: keyId.slice(0, keyId.length - unitInt[0].length),
      unit: parseInt(unitInt[1]),
    }
  }

  const rowSuffix = keyId.match(/_R(\d)$/)
  if (rowSuffix) {
    return {
      baseId: keyId.slice(0, keyId.length - rowSuffix[0].length),
      rowLevel: `R${rowSuffix[1]}`,
      unit: 1,
    }
  }

  return { baseId: keyId }
}

function buildJigAssignment(
  positions: JigPosition[],
  templateKeys: Record<string, LayoutKey>,
): Map<JigPosition, string> {
  const assignment = new Map<JigPosition, string>()

  if (Object.keys(templateKeys).length === 0) {
    const seen = new Set<string>()
    for (const pos of positions) {
      if (!pos.key_id || seen.has(pos.key_id)) continue
      seen.add(pos.key_id)
      assignment.set(pos, pos.key_id)
    }
    return assignment
  }

  const groupMap = new Map<string, JigPosition[]>()
  for (const pos of positions) {
    const gg = pos.geometry_group
    if (gg) {
      if (!groupMap.has(gg)) groupMap.set(gg, [])
      groupMap.get(gg)!.push(pos)
    }
  }

  const anonByRow = new Map<string, JigPosition[]>()
  for (const pos of positions) {
    if (pos.key_id === "") {
      const row = pos.row_level ?? ""
      if (!anonByRow.has(row)) anonByRow.set(row, [])
      anonByRow.get(row)!.push(pos)
    }
  }
  const anonCursors = new Map<string, number>()
  const UNIT_TOL = 0.01

  for (const [templateKeyId, km] of Object.entries(templateKeys)) {
    const params = resolveJigLookup(templateKeyId)

    if (params.geometryGroup) {
      const group = groupMap.get(params.geometryGroup)
      if (group) {
        for (const pos of group) assignment.set(pos, templateKeyId)
      }
      continue
    }

    if (params.isAnonymous) {
      const row = params.rowLevel ?? ""
      const cursor = anonCursors.get(row) ?? 0
      const slot = anonByRow.get(row)?.[cursor]
      if (slot) {
        assignment.set(slot, templateKeyId)
        anonCursors.set(row, cursor + 1)
      }
      continue
    }

    const isTallKey = !params.unit && km.h > 1
    const effectiveRowLevel = params.rowLevel ?? (isTallKey ? undefined : km.rowLevel)
    const hasExplicitUnit = params.unit != null
    const targetUnit = params.unit ?? (isTallKey ? km.h : km.w)

    let best: JigPosition | null = null
    let bestDelta = Infinity

    for (const pos of positions) {
      if (pos.key_id !== params.baseId) continue
      if (pos.geometry_group) continue
      if (assignment.has(pos)) continue
      if (params.shape && pos.shape !== params.shape) continue
      if (effectiveRowLevel && pos.row_level && effectiveRowLevel !== pos.row_level) continue

      const delta = Math.abs((pos.unit ?? 1) - targetUnit)
      if (hasExplicitUnit && delta > UNIT_TOL) continue
      if (delta < bestDelta) { best = pos; bestDelta = delta }
    }

    if (best) assignment.set(best, templateKeyId)
  }

  return assignment
}

function posByKeyFromAssignment(
  assignment: Map<JigPosition, string>,
): Map<string, JigPosition> {
  const map = new Map<string, JigPosition>()
  for (const [pos, kid] of assignment) {
    if (!map.has(kid)) map.set(kid, pos)
  }
  return map
}

function buildJigRenderContext(
  positions: JigPosition[],
  layout: Layout,
  topScale: number,
): JigRenderContext {
  const assignment = buildJigAssignment(positions, layout.keys)
  return {
    positions,
    templateKeys: layout.keys,
    assignment,
    posByKey: posByKeyFromAssignment(assignment),
    baseUnit: layout.baseUnit,
    topScale,
  }
}

// ─── 设计数据解析 ─────────────────────────────────────────────────────────

function resolveKeycapColor(source: {
  color?: string
  topColor?: string
  bgColor?: string
} | null | undefined, fallback: string): string {
  if (!source) return fallback
  return source.color ?? source.topColor ?? source.bgColor ?? fallback
}

function parseDesign(design: DesignPayload): ParsedDesign {
  const gs = design.globalKeycapStyle ?? {}
  const overridesByKey: Record<string, KeycapOverride> = {}

  for (const keyMap of Object.values(design.layerKeycapOverrides ?? {})) {
    for (const [keyId, ov] of Object.entries(keyMap)) {
      if (!overridesByKey[keyId]) overridesByKey[keyId] = {}
      const fields: (keyof KeycapOverride)[] = [
        "color", "bgColor", "topColor",
        "labelText", "labelColor", "fontSize", "fontFamily",
        "letterSpacing", "lineHeightRatio",
        "labelOffsetX", "labelOffsetY",
        "borderColor", "borderHidden",
      ]
      for (const field of fields) {
        if (field in ov) {
          (overridesByKey[keyId] as Record<string, unknown>)[field] = ov[field]
        }
      }
      // 将遗留双色收敛为单一 color，写入后去掉旧字段以免下游混淆
      const merged = overridesByKey[keyId]!
      if (merged.color != null || merged.topColor != null || merged.bgColor != null) {
        merged.color = resolveKeycapColor(merged, "#aaaaaa")
        delete merged.bgColor
        delete merged.topColor
      }
    }
  }

  return {
    globalColor: resolveKeycapColor(gs, "#aaaaaa"),
    globalFontSize: gs.fontSize ?? KEY_LABEL_SIZE,
    globalLabelColor: gs.labelColor ?? "#cccccc",
    globalFontFamily: design.fontFamily ?? "Inter, system-ui, sans-serif",
    overrides: overridesByKey,
    templateId: design.templateId ?? "",
    canvasElements: design.canvasElements ?? [],
  }
}

function loadTemplateLayout(templateId: string): Layout {
  const layoutPath = resolveDesignDataPath('layouts', `${templateId}.json`);
  if (!layoutPath || !fs.existsSync(layoutPath)) {
    return { keys: {}, baseUnit: 54 };
  }

  const layout = JSON.parse(fs.readFileSync(layoutPath, "utf-8").replace(/^\uFEFF/, ""))
  const keys: Record<string, LayoutKey> = {}
  for (const row of layout.rows ?? []) {
    for (const key of row.keys ?? []) {
      const kid = key.keyId
      if (kid) {
        keys[kid] = {
          x: Number(key.x ?? 0),
          y: Number(key.y ?? 0),
          w: Number(key.w ?? 1),
          h: Number(key.h ?? 1),
          label: key.label ?? "",
          rowLevel: key.rowLevel ?? undefined,
          shape: key.shape ?? undefined,
        }
      }
    }
  }
  return { keys, baseUnit: Number(layout.baseUnit ?? 54) }
}

function getKeyStyle(keyId: string, design: ParsedDesign, defaultLabel: string): KeyStyle {
  const ov = design.overrides[keyId] ?? {}
  return {
    color: resolveKeycapColor(ov, design.globalColor),
    labelText: ov.labelText ?? defaultLabel,
    labelColor: ov.labelColor ?? design.globalLabelColor,
    fontSize: ov.fontSize ?? design.globalFontSize,
    fontFamily: ov.fontFamily ?? design.globalFontFamily,
    letterSpacing: ov.letterSpacing ?? 0,
    lineHeightRatio: ov.lineHeightRatio ?? 1.2,
    labelOffsetX: ov.labelOffsetX ?? 0,
    labelOffsetY: ov.labelOffsetY ?? 0,
  }
}

function resolveKeyShape(keyId: string, km: LayoutKey): string {
  return km.shape ?? resolveJigLookup(keyId).shape ?? "rect"
}

function getDesignTopFaceRect(
  keyId: string,
  km: LayoutKey,
  baseUnit: number,
): { x: number; y: number; w: number; h: number } {
  const shape = resolveKeyShape(keyId, km)
  const px = km.x * baseUnit + KEYCAP_GAP / 2
  const py = km.y * baseUnit + KEYCAP_GAP / 2
  const pw = km.w * baseUnit - KEYCAP_GAP
  const ph = km.h * baseUnit - KEYCAP_GAP
  return getTopFaceRects(shape, px, py, pw, ph)[0]!
}

function getDesignKeyRect(km: LayoutKey, baseUnit: number) {
  return {
    x: km.x * baseUnit + KEYCAP_GAP / 2,
    y: km.y * baseUnit + KEYCAP_GAP / 2,
    w: km.w * baseUnit - KEYCAP_GAP,
    h: km.h * baseUnit - KEYCAP_GAP,
  }
}

function computeJigTopScale(positions: JigPosition[], baseUnit: number): number {
  const design1uTopW = baseUnit - KEYCAP_GAP - KEY_PAD_LEFT - KEY_PAD_RIGHT
  for (const pos of positions) {
    if (pos.unit === 1.0 && pos.top_face_w != null) {
      return pos.top_face_w / design1uTopW
    }
  }
  return 1.0
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function makeOpDkAttrs(opacity: number, kidAttr: string): [string, string] {
  return [
    opacity < 1 ? ` opacity="${opacity.toFixed(2)}"` : "",
    kidAttr ? ` data-key="${kidAttr}"` : "",
  ]
}

// ─── 颜色层 + 文字描述符 ──────────────────────────────────────────────────

function buildDesignLayersIntermediate(
  ctx: JigRenderContext,
  design: ParsedDesign,
  userAssets?: UserFontAssetMap,
): DesignLayersIntermediate {
  const { assignment, templateKeys, topScale } = ctx
  const colorLines: string[] = ['<g id="jig-color-layer">']
  const descriptors: TextDescriptor[] = []
  const extraAttrs: Record<string, string> = {}
  const fallbackTexts: string[] = []
  const textRotations = new Map<string, { cx: number; cy: number; angle: number }>()
  const labelRenderedKeys = new Set<string>()
  const skipped = ctx.positions.length - assignment.size

  for (const [pos, keyId] of assignment) {
    const defaultLabel = templateKeys[keyId]?.label ?? ""
    const st = getKeyStyle(keyId, design, defaultLabel)
    const km = templateKeys[keyId]

    const bottom = resolveBottomFace(pos, topScale)
    if (bottom) {
      colorLines.push(renderShape(bottom, st.color, `data-key="${keyId}" data-layer="bottom"`))
    }

    const top = resolveTopFace(pos, topScale)
    if (top) {
      colorLines.push(renderShape(top, st.color, `data-key="${keyId}" data-layer="top"`))
    }

    if (!top || !st.labelText || labelRenderedKeys.has(keyId)) continue
    labelRenderedKeys.add(keyId)

    const fs_ = st.fontSize * topScale
    const offx = st.labelOffsetX * topScale
    const offy = st.labelOffsetY * topScale
    const lh = fs_ * st.lineHeightRatio
    const ls = st.letterSpacing * topScale
    const textLines = st.labelText.split("\n")
    const n = textLines.length
    const opticalY = fs_ * KEY_LABEL_OPTICAL_CENTER_RATIO
    const multiY = ((n - 1) * lh) / 2

    let cx: number
    let blockCenterY: number
    let rotCx: number
    let rotCy: number

    if (top.kind === "rect") {
      cx = top.x + top.w / 2 + offx
      blockCenterY = top.y + top.h / 2 + offy - opticalY
      rotCx = top.x + top.w / 2
      rotCy = top.y + top.h / 2
    } else {
      const bbox = pointsBBox(top.points)
      cx = (pos.label_cx ?? (bbox.x + bbox.w / 2)) + offx
      blockCenterY = (pos.label_cy ?? (bbox.y + bbox.h / 2)) + offy - opticalY
      rotCx = pos.label_cx ?? (bbox.x + bbox.w / 2)
      rotCy = pos.label_cy ?? (bbox.y + bbox.h / 2)
    }

    const cy = blockCenterY - multiY
    const jigRotated = km != null && isJigRotated(km, pos)
    const rotTransform = jigRotated
      ? ` transform="rotate(-90,${rotCx.toFixed(4)},${rotCy.toFixed(4)})"`
      : ""

    if (!canOutlineFont(st.fontFamily, userAssets)) {
      const ff = isUserFontRef(st.fontFamily)
        ? toCssFontFamily(st.fontFamily)
        : resolveFontFamily(st.fontFamily)
      const lsAttr = ls ? ` letter-spacing="${ls.toFixed(4)}"` : ""
      const tAttrs =
        `x="${cx.toFixed(4)}" y="${cy.toFixed(4)}" ` +
        `font-size="${fs_.toFixed(4)}" fill="${st.labelColor}" ` +
        `text-anchor="middle" dominant-baseline="central" ` +
        `font-family="${ff}"${lsAttr} ` +
        `data-key="${keyId}"${rotTransform}`

      if (n === 1) {
        fallbackTexts.push(`  <text ${tAttrs}>${escapeXml(st.labelText)}</text>`)
      } else {
        const tspans = textLines.map((line, i) => {
          const dy = i === 0 ? 0 : lh
          return `<tspan x="${cx.toFixed(4)}" dy="${dy.toFixed(4)}">${escapeXml(line || "\u00A0")}</tspan>`
        })
        fallbackTexts.push(`  <text ${tAttrs}>${tspans.join("")}</text>`)
      }
    } else {
      const descId = `${keyId}__${descriptors.length}`
      descriptors.push({
        id: descId,
        x: cx,
        y: blockCenterY,
        fontSize: fs_,
        fontFamily: st.fontFamily,
        lines: textLines,
        lineHeightRatio: st.lineHeightRatio,
        letterSpacing: ls,
        fill: st.labelColor,
      })
      extraAttrs[descId] = `data-key="${keyId}"`
      if (jigRotated) {
        textRotations.set(descId, { cx: rotCx, cy: rotCy, angle: -90 })
      }
    }
  }

  if (skipped > 0) {
    colorLines.splice(
      1, 0,
      `  <!-- ${skipped} jig position(s) skipped (not in template / unmatched params) -->`,
    )
  }
  colorLines.push("</g>")

  return {
    colorLayer: colorLines.join("\n"),
    textDescriptors: descriptors,
    textExtraAttrs: extraAttrs,
    fallbackTexts,
    textRotations,
  }
}

async function buildLabelLayer(
  intermediate: DesignLayersIntermediate,
  userAssets?: UserFontAssetMap,
): Promise<string> {
  const lines: string[] = ['<g id="jig-label-layer">']

  if (intermediate.textDescriptors.length > 0) {
    const fillById = new Map(intermediate.textDescriptors.map(d => [d.id, d.fill]))
    const results = await textDescriptorsToPathResults(
      intermediate.textDescriptors,
      userAssets,
    )
    for (const r of results) {
      if (r.pathD === null) continue
      const extra = intermediate.textExtraAttrs[r.id] ?? ""
      const fill = fillById.get(r.id) ?? "#000"
      const rot = intermediate.textRotations.get(r.id)
      if (rot) {
        lines.push(
          `  <g transform="rotate(${rot.angle},${rot.cx.toFixed(4)},${rot.cy.toFixed(4)})">` +
          `<path d="${r.pathD}" fill="${fill}"${extra ? " " + extra : ""}/>` +
          `</g>`,
        )
      } else {
        lines.push(`  <path d="${r.pathD}" fill="${fill}"${extra ? " " + extra : ""}/>`)
      }
    }
  }

  for (const t of intermediate.fallbackTexts) {
    lines.push(t)
  }

  lines.push("</g>")
  return lines.join("\n")
}

// ─── 图片图层（单键 + 全局合并）──────────────────────────────────────────

function ensureRasterResource(
  defsLines: string[],
  src: string,
  imageCache: Map<string, string>,
): string {
  let resourceId = imageCache.get(src)
  if (resourceId) return resourceId

  resourceId = `jig-img-res-${imageCache.size}`
  imageCache.set(src, resourceId)
  defsLines.push(
    `    <image id="${resourceId}" xlink:href="${src}" href="${src}" ` +
    `width="1" height="1" preserveAspectRatio="none"/>`,
  )
  return resourceId
}

function buildClippedImageMarkup(
  clipId: string,
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  kidAttr: string,
  innerUse: string,
): string {
  const [opAttr, dkAttr] = makeOpDkAttrs(opacity, kidAttr)
  if (rotation) {
    const [ix, iy, iw, ih] = imgRect
    const cx = ix + iw / 2
    const cy = iy + ih / 2
    return (
      `  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}>` +
      `<g transform="rotate(${rotation},${cx.toFixed(4)},${cy.toFixed(4)})">${innerUse}</g></g>`
    )
  }
  return `  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}>${innerUse}</g>`
}

function emitClippedImage(
  defsLines: string[],
  lines: string[],
  clipId: string,
  clipShape: JigShape,
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  src: string,
  kidAttr: string,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): void {
  pushClipPathDef(defsLines, clipId, clipShape)
  const [ix, iy, iw, ih] = imgRect

  if (isSvgDataUrl(src)) {
    const svgText = decodeSvgSrc(src)
    if (svgText) {
      const symbolId = ensureSvgSymbol(svgText, svgCache, defsLines)
      const useEl =
        `<use xlink:href="#${symbolId}" href="#${symbolId}" ` +
        `x="${ix.toFixed(4)}" y="${iy.toFixed(4)}" ` +
        `width="${iw.toFixed(4)}" height="${ih.toFixed(4)}"/>`
      lines.push(buildClippedImageMarkup(clipId, imgRect, rotation, opacity, kidAttr, useEl))
      return
    }
  }

  const resourceId = ensureRasterResource(defsLines, src, imageCache)
  const cx = ix + iw / 2
  const cy = iy + ih / 2
  const rotatePart = rotation ? `rotate(${rotation},${cx.toFixed(4)},${cy.toFixed(4)}) ` : ""
  const transformAttr =
    `transform="${rotatePart}translate(${ix.toFixed(4)},${iy.toFixed(4)}) ` +
    `scale(${iw.toFixed(4)},${ih.toFixed(4)})"`
  const useEl = `<use ${transformAttr} xlink:href="#${resourceId}" href="#${resourceId}"/>`
  lines.push(buildClippedImageMarkup(clipId, imgRect, 0, opacity, kidAttr, useEl))
}

type ImagePlacement = {
  kid: string
  km: LayoutKey
  pos: JigPosition
  img: CanvasElement
  designRef: { x: number; y: number; w: number; h: number }
  jigRef: { x: number; y: number; w: number; h: number }
  clipShape: JigShape
}

function collectPerKeyImagePlacements(
  canvasElements: CanvasElement[],
  ctx: JigRenderContext,
): ImagePlacement[] {
  const placements: ImagePlacement[] = []
  const { posByKey, templateKeys, baseUnit } = ctx

  for (const img of canvasElements) {
    if (img.type !== "image" || !img.clipToKeycapId) continue
    const kid = img.clipToKeycapId
    const pos = posByKey.get(kid)
    const km = templateKeys[kid]
    if (!pos || !km) continue

    const topMapping = resolveTopFaceMappingRect(pos)
    if (!topMapping) continue

    const clipShape = resolvePerKeyClipShape(pos, ctx.topScale, !!img.clipToTopFace)
    if (!clipShape) continue

    // 坐标映射始终基于设计顶面 ↔ 治具顶面；clip 区域单独由 clipShape 决定
    const designRef = getDesignTopFaceRect(kid, km, baseUnit)
    const jigRef = { x: topMapping.x, y: topMapping.y, w: topMapping.w, h: topMapping.h }

    placements.push({ kid, km, pos, img, designRef, jigRef, clipShape })
  }

  return placements
}

function collectGlobalImagePlacements(
  canvasElements: CanvasElement[],
  ctx: JigRenderContext,
): ImagePlacement[] {
  const placements: ImagePlacement[] = []
  const { templateKeys, posByKey, baseUnit } = ctx

  for (const img of canvasElements) {
    if (img.type !== "image" || img.clipToKeycapId) continue

    const imgSvgX = img.x - ART_PAD
    const imgSvgY = img.y - ART_PAD
    const imgW = img.width
    const imgH = img.height

    const explicitIds = img.clipToKeycapIds?.length ? img.clipToKeycapIds : null
    const targetKeyIds = explicitIds ?? Object.keys(templateKeys)

    for (const kid of targetKeyIds) {
      const km = templateKeys[kid]
      const pos = posByKey.get(kid)
      if (!pos || !km) continue

      const designRef = getDesignKeyRect(km, baseUnit)
      if (!explicitIds) {
        if (
          imgSvgX + imgW <= designRef.x || imgSvgX >= designRef.x + designRef.w ||
          imgSvgY + imgH <= designRef.y || imgSvgY >= designRef.y + designRef.h
        ) continue
      }

      const clipShape = resolveGlobalClipShape(pos, ctx.topScale)
      if (!clipShape) continue

      const baseBox = resolveBaseBox(pos)
      if (!baseBox) continue

      placements.push({
        kid,
        km,
        pos,
        img,
        designRef,
        jigRef: { x: baseBox.x, y: baseBox.y, w: baseBox.w, h: baseBox.h },
        clipShape,
      })
    }
  }

  return placements
}

function buildImageLayerFromPlacements(
  layerId: string,
  clipIdPrefix: string,
  placements: ImagePlacement[],
  ctx: JigRenderContext,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): ImageLayerResult {
  if (placements.length === 0) return { layerSvg: "", defsContent: "" }

  const lines: string[] = [`<g id="${layerId}">`]
  const defsLines: string[] = []

  placements.forEach((p, idx) => {
    const imgSvgX = p.img.x - ART_PAD
    const imgSvgY = p.img.y - ART_PAD
    const mapped = mapCanvasImageToJig({
      imgSvgX,
      imgSvgY,
      imgW: p.img.width,
      imgH: p.img.height,
      rotation: p.img.rotation,
      designRef: p.designRef,
      jigRef: p.jigRef,
      jigRotated: isJigRotated(p.km, p.pos),
      topScale: ctx.topScale,
    })

    emitClippedImage(
      defsLines,
      lines,
      `${clipIdPrefix}-${idx}`,
      p.clipShape,
      [mapped.x, mapped.y, mapped.w, mapped.h],
      mapped.rotation,
      p.img.opacity ?? 1,
      p.img.src ?? "",
      p.kid,
      imageCache,
      svgCache,
    )
  })

  lines.push("</g>")
  return { layerSvg: lines.join("\n"), defsContent: defsLines.join("\n") }
}

function buildCanvasImageLayers(
  canvasElements: CanvasElement[],
  ctx: JigRenderContext,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): { perKey: ImageLayerResult; global: ImageLayerResult } {
  return {
    perKey: buildImageLayerFromPlacements(
      "jig-image-layer",
      "clip-jig-img",
      collectPerKeyImagePlacements(canvasElements, ctx),
      ctx,
      imageCache,
      svgCache,
    ),
    global: buildImageLayerFromPlacements(
      "jig-global-image-layer",
      "clip-jig-gimg",
      collectGlobalImagePlacements(canvasElements, ctx),
      ctx,
      imageCache,
      svgCache,
    ),
  }
}

// ─── 公共入口 ─────────────────────────────────────────────────────────────

/**
 * 根据设计 JSON 生成治具 SVG 字符串。
 * 文字使用 opentype.js 转曲为 <path>；无法转曲时保留 <text>。
 */
export async function generateJigSvg(
  design: DesignPayload,
  userAssets?: UserFontAssetMap,
): Promise<string> {
  const parsedDesign = parseDesign(design)
  const anyLabelsHidden = (design.layers ?? []).some(l => l.labelsHidden === true)

  const layout = parsedDesign.templateId
    ? loadTemplateLayout(parsedDesign.templateId)
    : { keys: {}, baseUnit: 54 }

  const positionsPath = resolveDesignDataPath(
    'jig',
    'keycap_jig_positions.json',
  );
  if (!positionsPath || !fs.existsSync(positionsPath)) {
    throw new Error(`治具位置文件不存在: ${positionsPath ?? 'jig/keycap_jig_positions.json'}`);
  }
  const positions: JigPosition[] = JSON.parse(
    fs.readFileSync(positionsPath, 'utf-8').replace(/^\uFEFF/, ''),
  );

  const topScale = computeJigTopScale(positions, layout.baseUnit);
  const ctx = buildJigRenderContext(positions, layout, topScale);

  const jigSvgPath = resolveDesignDataPath('jig', 'keycap_jig.svg');
  if (!jigSvgPath || !fs.existsSync(jigSvgPath)) {
    throw new Error(`治具 SVG 文件不存在: ${jigSvgPath ?? 'jig/keycap_jig.svg'}`);
  }
  let svgText = fs.readFileSync(jigSvgPath, 'utf-8');

  const intermediate = buildDesignLayersIntermediate(ctx, parsedDesign, userAssets)
  const labelLayer = anyLabelsHidden
    ? ""
    : await buildLabelLayer(intermediate, userAssets)

  const imageCache = new Map<string, string>()
  const svgCache = new Map<string, string>()
  const { perKey: imgLayer, global: globalImgLayer } = buildCanvasImageLayers(
    parsedDesign.canvasElements,
    ctx,
    imageCache,
    svgCache,
  )

  const allDefsContent = [globalImgLayer.defsContent, imgLayer.defsContent]
    .filter(Boolean)
    .join("\n")
  svgText = injectIntoDefs(svgText, allDefsContent)
  svgText = ensureXlinkNamespace(svgText)
  svgText = injectLayers(
    svgText,
    intermediate.colorLayer,
    globalImgLayer.layerSvg,
    imgLayer.layerSvg,
    labelLayer,
  )

  return svgText
}
