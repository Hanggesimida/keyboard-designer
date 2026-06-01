/**
 * 治具 SVG 生成核心逻辑 — Python generate_jig_svg.py 的 TypeScript 完整迁移
 *
 * 主要差异：
 *   - 字体嵌入（base64 @font-face）→ 字体转曲（opentype.js <path>）
 *   - CJK 字体降级保留 <text>，不注入 @font-face
 *   - 数据文件通过 fs 读取（服务端 Node.js）
 */

import fs from "fs"
import path from "path"
import { resolveFontFamily, resolveFontFile } from "@/lib/fontAssets"
import {
  textDescriptorsToPathResults,
  type TextDescriptor,
} from "@/lib/jig/fontToPath"

// ─── 几何常量（与 keycapGeometry.ts / Python 脚本保持同步）─────────────────
const KEYCAP_GAP = 2
const KEY_PAD_LEFT = 11
const KEY_PAD_TOP = 6
const KEY_PAD_RIGHT = 11
const KEY_PAD_BOTTOM = 10
const KEY_LABEL_SIZE = 7
const KEY_LABEL_OPTICAL_CENTER_RATIO = 0.09
const ART_PAD = 28

// ─── 类型定义 ─────────────────────────────────────────────────────────────

interface GlobalKeycapStyle {
  bgColor?: string
  topColor?: string
  fontSize?: number
  labelColor?: string
  [key: string]: unknown
}

interface KeycapOverride {
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
  clipToTopFace?: boolean
  clipToKeycaps?: boolean
  [key: string]: unknown
}

/** 与 exportArtboardJson 导出格式完全一致 */
export interface DesignPayload {
  version?: number
  templateId: string
  artboardBackground?: string
  fontFamily?: string
  globalKeycapStyle?: GlobalKeycapStyle
  layers?: unknown[]
  layerKeycapOverrides?: Record<string, Record<string, KeycapOverride>>
  canvasElements?: CanvasElement[]
}

interface ParsedDesign {
  globalBg: string
  globalTop: string
  globalFontSize: number
  globalLabelColor: string
  globalFontFamily: string
  overrides: Record<string, KeycapOverride>
  templateId: string
  canvasElements: CanvasElement[]
}

interface LayoutKey {
  x: number
  y: number
  w: number
  h: number
  label: string
  rowLevel?: string
}

interface Layout {
  keys: Record<string, LayoutKey>
  baseUnit: number
}

interface JigPosition {
  key_id: string
  unit?: number
  row_level?: string
  geometry_group?: string
  top_face_x?: number
  top_face_y?: number
  top_face_w?: number
  top_face_h?: number
  top_face_rx?: number
  bottom_box_x?: number
  bottom_box_y?: number
  bottom_box_w?: number
  bottom_box_h?: number
  base_box_x?: number
  base_box_y?: number
  base_box_w?: number
  base_box_h?: number
  base_box_rx?: number
}

// ─── 设计数据解析 ─────────────────────────────────────────────────────────

function parseDesign(design: DesignPayload): ParsedDesign {
  const gs = design.globalKeycapStyle ?? {}

  // 合并所有图层的逐键覆盖（后写覆盖先写，与渲染层顺序一致）
  const overridesByKey: Record<string, KeycapOverride> = {}
  for (const keyMap of Object.values(design.layerKeycapOverrides ?? {})) {
    for (const [keyId, ov] of Object.entries(keyMap)) {
      if (!overridesByKey[keyId]) overridesByKey[keyId] = {}
      const fields: (keyof KeycapOverride)[] = [
        "bgColor", "topColor",
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
    }
  }

  return {
    globalBg: gs.bgColor ?? "#888888",
    globalTop: gs.topColor ?? "#aaaaaa",
    globalFontSize: gs.fontSize ?? KEY_LABEL_SIZE,
    globalLabelColor: gs.labelColor ?? "#cccccc",
    globalFontFamily: design.fontFamily ?? "Inter, system-ui, sans-serif",
    overrides: overridesByKey,
    templateId: design.templateId ?? "",
    canvasElements: design.canvasElements ?? [],
  }
}

// ─── 布局加载 ─────────────────────────────────────────────────────────────

function loadTemplateLayout(templateId: string): Layout {
  const layoutPath = path.join(
    process.cwd(),
    "modules/design/data/layouts",
    `${templateId}.json`,
  )
  if (!fs.existsSync(layoutPath)) {
    return { keys: {}, baseUnit: 54 }
  }

  const layout = JSON.parse(fs.readFileSync(layoutPath, "utf-8"))
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
        }
      }
    }
  }
  return { keys, baseUnit: Number(layout.baseUnit ?? 54) }
}

// ─── 样式合并 ─────────────────────────────────────────────────────────────

interface KeyStyle {
  bgColor: string
  topColor: string
  labelText: string
  labelColor: string
  fontSize: number
  fontFamily: string
  letterSpacing: number
  lineHeightRatio: number
  labelOffsetX: number
  labelOffsetY: number
}

function getKeyStyle(keyId: string, design: ParsedDesign, defaultLabel: string): KeyStyle {
  const ov = design.overrides[keyId] ?? {}
  const rawFont = ov.fontFamily ?? design.globalFontFamily
  return {
    bgColor: ov.bgColor ?? design.globalBg,
    topColor: ov.topColor ?? design.globalTop,
    labelText: ov.labelText ?? defaultLabel,
    labelColor: ov.labelColor ?? design.globalLabelColor,
    fontSize: ov.fontSize ?? design.globalFontSize,
    fontFamily: rawFont,
    letterSpacing: ov.letterSpacing ?? 0,
    lineHeightRatio: ov.lineHeightRatio ?? 1.2,
    labelOffsetX: ov.labelOffsetX ?? 0,
    labelOffsetY: ov.labelOffsetY ?? 0,
  }
}

// ─── 坐标比例因子 ─────────────────────────────────────────────────────────

function computeJigTopScale(positions: JigPosition[], baseUnit: number): number {
  const design1uTopW = baseUnit - KEYCAP_GAP - KEY_PAD_LEFT - KEY_PAD_RIGHT
  for (const pos of positions) {
    if (pos.unit === 1.0 && pos.top_face_w != null) {
      return pos.top_face_w / design1uTopW
    }
  }
  return 1.0
}

// ─── SVG 辅助 ─────────────────────────────────────────────────────────────

function svgRect(
  x: number, y: number, w: number, h: number,
  fill: string, rx = 0, extra = "",
): string {
  let attrs = `x="${x.toFixed(4)}" y="${y.toFixed(4)}" width="${w.toFixed(4)}" height="${h.toFixed(4)}" fill="${fill}"`
  if (rx) attrs += ` rx="${rx.toFixed(4)}"`
  if (extra) attrs += ` ${extra}`
  return `  <rect ${attrs}/>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function pushClipPathDef(
  defsLines: string[],
  clipId: string,
  [cxR, cyR, cwR, chR, crx]: [number, number, number, number, number],
): void {
  defsLines.push(`    <clipPath id="${clipId}">`)
  defsLines.push(`      <rect x="${cxR.toFixed(4)}" y="${cyR.toFixed(4)}" width="${cwR.toFixed(4)}" height="${chR.toFixed(4)}" rx="${crx.toFixed(4)}"/>`)
  defsLines.push(`    </clipPath>`)
}

function makeOpDkAttrs(opacity: number, kidAttr: string): [string, string] {
  return [
    opacity < 1 ? ` opacity="${opacity.toFixed(2)}"` : "",
    kidAttr ? ` data-key="${kidAttr}"` : "",
  ]
}

// ─── 颜色层 + 文字描述符收集 ──────────────────────────────────────────────

interface DesignLayersIntermediate {
  colorLayer: string
  textDescriptors: TextDescriptor[]
  /** 每个 descriptor 对应的额外 SVG 属性（data-key 等），在替换为 path 后追加 */
  textExtraAttrs: Record<string, string>
  /** CJK 降级：直接输出的 <text> 字符串列表 */
  fallbackTexts: string[]
}

/**
 * 预选每个 key_id 对应的唯一治具位置集合，确保设计器里一个键只渲染一次。
 *
 * 策略：
 *  - 普通键（无 geometry_group 或单槽 group）：每个 key_id 只保留 unit 最接近
 *    布局宽度的那一条；unit 相同时先出现的优先。
 *  - 多槽组合键（同一 geometry_group 下有多条记录，如 ISO 梯形回车）：
 *    整组全部纳入，供一个物理键占多个治具槽的情形使用。
 *  - 不在 templateKeys 中，或 rowLevel 不匹配的条目，均排除。
 *    若 templateKeys 为空（无模板），仅做唯一性去重，不做布局过滤。
 */
function selectUniqueJigPositions(
  positions: JigPosition[],
  templateKeys: Record<string, LayoutKey>,
  TOL: number = 0.05,
): Set<JigPosition> {
  const hasTemplate = Object.keys(templateKeys).length > 0

  // 识别多槽 geometry_group（同 group 下 >= 2 条）
  const groupMembersMap = new Map<string, JigPosition[]>()
  for (const pos of positions) {
    const gg = pos.geometry_group
    if (gg) {
      if (!groupMembersMap.has(gg)) groupMembersMap.set(gg, [])
      groupMembersMap.get(gg)!.push(pos)
    }
  }
  const multiGroups = new Set(
    [...groupMembersMap.entries()].filter(([, v]) => v.length > 1).map(([k]) => k),
  )

  const bestByKey = new Map<string, JigPosition>()
  const selectedGroupKeys = new Set<string>()

  for (const pos of positions) {
    const kid = pos.key_id
    if (!kid) continue

    // 布局过滤
    if (hasTemplate) {
      if (!templateKeys[kid]) continue
      const layoutRowLevel = templateKeys[kid].rowLevel
      if (layoutRowLevel && pos.row_level && layoutRowLevel !== pos.row_level) continue
    }

    const gg = pos.geometry_group
    if (gg && multiGroups.has(gg)) {
      // 多槽组合键：整组保留（单次标记即可）
      selectedGroupKeys.add(gg)
      continue
    }

    // 普通键：取 unit 最接近布局宽度的一条
    if (!bestByKey.has(kid)) {
      bestByKey.set(kid, pos)
    } else {
      const lw = hasTemplate ? (templateKeys[kid]?.w ?? 1) : 1
      const existing = bestByKey.get(kid)!
      if (Math.abs((pos.unit ?? 1) - lw) < Math.abs((existing.unit ?? 1) - lw)) {
        bestByKey.set(kid, pos)
      }
    }
  }

  const selected = new Set<JigPosition>()
  for (const pos of bestByKey.values()) selected.add(pos)
  for (const gg of selectedGroupKeys) {
    for (const pos of groupMembersMap.get(gg)!) selected.add(pos)
  }
  return selected
}

function buildDesignLayersIntermediate(
  positions: JigPosition[],
  design: ParsedDesign,
  layout: Layout,
  topScale: number,
): DesignLayersIntermediate {
  const templateKeys = layout.keys
  const colorLines: string[] = ['<g id="jig-color-layer">']
  const descriptors: TextDescriptor[] = []
  const extraAttrs: Record<string, string> = {}
  const fallbackTexts: string[] = []

  const TOL = 0.05
  // 预计算：每个 key_id 唯一对应一条治具位置（含模板过滤 + 唯一性）
  const selectedPositions = selectUniqueJigPositions(positions, templateKeys, TOL)
  let skipped = 0

  for (const pos of positions) {
    const keyId = pos.key_id

    // 唯一性 + 模板过滤（由 selectUniqueJigPositions 统一处理）
    if (!selectedPositions.has(pos)) { skipped++; continue }

    const defaultLabel = templateKeys[keyId]?.label ?? ""
    const st = getKeyStyle(keyId, design, defaultLabel)

    const bx = pos.bottom_box_x, by = pos.bottom_box_y
    const bw = pos.bottom_box_w, bh = pos.bottom_box_h
    if (bx != null && by != null && bw != null && bh != null) {
      colorLines.push(svgRect(bx, by, bw, bh, st.bgColor,
        0, `data-key="${keyId}" data-layer="bottom"`))
    }

    const tx = pos.top_face_x, ty = pos.top_face_y
    const tw = pos.top_face_w, th = pos.top_face_h
    const trx = pos.top_face_rx ?? 0
    if (tx != null && ty != null && tw != null && th != null) {
      colorLines.push(svgRect(tx, ty, tw, th, st.topColor,
        trx, `data-key="${keyId}" data-layer="top"`))

      // 文字
      if (st.labelText) {
        const fs_ = st.fontSize * topScale
        const offx = st.labelOffsetX * topScale
        const offy = st.labelOffsetY * topScale
        const lhr = st.lineHeightRatio
        const lh = fs_ * lhr
        const ls = st.letterSpacing * topScale

        const textLines = st.labelText.split("\n")
        const n = textLines.length
        const opticalY = fs_ * KEY_LABEL_OPTICAL_CENTER_RATIO
        const multiY = ((n - 1) * lh) / 2

        const cx = tx + tw / 2 + offx
        // blockCenterY：整块多行文字的视觉中心（fontToPath 期望的 y）
        const blockCenterY = ty + th / 2 + offy - opticalY
        // firstLineCenterY：第一行的视觉中心（CJK <text> tspan 用）
        const cy = blockCenterY - multiY

        // 判断是否 CJK
        const fontFile = resolveFontFile(st.fontFamily)
        if (fontFile === null) {
          // CJK 降级：直接输出 <text>
          const ff = resolveFontFamily(st.fontFamily)
          const lc = st.labelColor
          const lsAttr = ls ? ` letter-spacing="${ls.toFixed(4)}"` : ""
          const tAttrs = `x="${cx.toFixed(4)}" y="${cy.toFixed(4)}" ` +
            `font-size="${fs_.toFixed(4)}" fill="${lc}" ` +
            `text-anchor="middle" dominant-baseline="central" ` +
            `font-family="${ff}"${lsAttr} ` +
            `data-key="${keyId}"`

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
          // 非 CJK：收集 descriptor
          const descId = `${keyId}__${descriptors.length}`
          descriptors.push({
            id: descId,
            x: cx,
            y: blockCenterY,
            fontSize: fs_,
            fontFamily: st.fontFamily,
            lines: textLines,
            lineHeightRatio: lhr,
            letterSpacing: ls,
            fill: st.labelColor,
          })
          extraAttrs[descId] = `data-key="${keyId}"`
        }
      }
    }
  }

  if (skipped > 0) {
    colorLines.splice(1, 0, `  <!-- ${skipped} jig position(s) skipped (not in template / wrong unit) -->`)
  }
  colorLines.push("</g>")

  return {
    colorLayer: colorLines.join("\n"),
    textDescriptors: descriptors,
    textExtraAttrs: extraAttrs,
    fallbackTexts,
  }
}

// ─── 标签图层最终合成 ─────────────────────────────────────────────────────

async function buildLabelLayer(intermediate: DesignLayersIntermediate): Promise<string> {
  const lines: string[] = ['<g id="jig-label-layer">']

  if (intermediate.textDescriptors.length > 0) {
    const fillById = new Map(intermediate.textDescriptors.map(d => [d.id, d.fill]))
    const results = await textDescriptorsToPathResults(intermediate.textDescriptors)
    for (const r of results) {
      if (r.pathD === null) continue
      const extra = intermediate.textExtraAttrs[r.id] ?? ""
      const fill = fillById.get(r.id) ?? "#000"
      lines.push(`  <path d="${r.pathD}" fill="${fill}"${extra ? " " + extra : ""}/>`)
    }
  }

  // CJK 降级文字
  for (const t of intermediate.fallbackTexts) {
    lines.push(t)
  }

  lines.push("</g>")
  return lines.join("\n")
}

// ─── 单键帽图片图层 ───────────────────────────────────────────────────────

function buildPosByKey(
  positions: JigPosition[],
  templateKeys: Record<string, LayoutKey>,
): Map<string, JigPosition> {
  const map = new Map<string, JigPosition>()
  for (const pos of positions) {
    const kid = pos.key_id
    // rowLevel 过滤：治具位置的 row_level 与布局键的 rowLevel 都存在时必须匹配
    const layoutRowLevel = templateKeys[kid]?.rowLevel
    if (layoutRowLevel && pos.row_level && layoutRowLevel !== pos.row_level) continue
    if (!map.has(kid)) {
      map.set(kid, pos)
    } else {
      const lw = templateKeys[kid]?.w ?? 1
      const existing = map.get(kid)!
      if (Math.abs((pos.unit ?? 1) - lw) < Math.abs((existing.unit ?? 1) - lw)) {
        map.set(kid, pos)
      }
    }
  }
  return map
}

/**
 * 将 clipPath 定义写入 defsLines（最终统一注入 SVG 根 <defs>），
 * 将 <use> 元素写入 lines。
 *
 * 相同 src 的 base64 数据只在 <defs> 中写一次（以 width="1" height="1" 的
 * <image> 保存），每个键帽实例通过 <use> + transform 引用该资源，
 * 彻底消除全局图片覆盖多键时的 base64 重复膨胀。
 *
 * clipPath 始终加在外层 <g> 上（无 transform），确保 clip 坐标始终在治具坐标系
 * 下生效，与内层 <use> 的 transform 互不干扰。
 *
 * <image> 同时输出 xlink:href 与 href，确保 Illustrator（SVG 1.1）正常识别。
 */
function emitImage(
  defsLines: string[],
  lines: string[],
  clipId: string,
  clipRect: [number, number, number, number, number],
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  src: string,
  kidAttr = "",
  imageCache: Map<string, string>,
): void {
  const [ix, iy, iw, ih] = imgRect

  pushClipPathDef(defsLines, clipId, clipRect)
  const [opAttr, dkAttr] = makeOpDkAttrs(opacity, kidAttr)

  let resourceId = imageCache.get(src)
  if (!resourceId) {
    resourceId = `jig-img-res-${imageCache.size}`
    imageCache.set(src, resourceId)
    defsLines.push(
      `    <image id="${resourceId}" xlink:href="${src}" href="${src}" ` +
      `width="1" height="1" preserveAspectRatio="none"/>`,
    )
  }
  // transform 将单位图片 [0,1]×[0,1] 映射到 imgRect；
  // rotation 绕图片中心旋转，坐标在外层（治具）坐标系中。
  const cx_ = ix + iw / 2
  const cy_ = iy + ih / 2
  const rotatePart = rotation
    ? `rotate(${rotation},${cx_.toFixed(4)},${cy_.toFixed(4)}) `
    : ""
  const transformAttr =
    `transform="${rotatePart}translate(${ix.toFixed(4)},${iy.toFixed(4)}) ` +
    `scale(${iw.toFixed(4)},${ih.toFixed(4)})"`
  // clip-path 加在无 transform 的外层 <g>，保证 clip 坐标系与治具坐标系一致
  lines.push(
    `  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}>` +
    `<use ${transformAttr} xlink:href="#${resourceId}" href="#${resourceId}"/>` +
    `</g>`,
  )
}

interface ImageLayerResult {
  layerSvg: string
  defsContent: string
}

function buildCanvasImageLayer(
  canvasElements: CanvasElement[],
  positions: JigPosition[],
  layout: Layout,
  topScale: number,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): ImageLayerResult {
  const perKeyImgs = canvasElements.filter(
    el => el.type === "image" && el.clipToKeycapId,
  )
  if (perKeyImgs.length === 0) return { layerSvg: "", defsContent: "" }

  const { keys: templateKeys, baseUnit } = layout
  const posByKey = buildPosByKey(positions, templateKeys)
  const lines: string[] = ['<g id="jig-image-layer">']
  const defsLines: string[] = []
  let clipIdx = 0

  for (const img of perKeyImgs) {
    const kid = img.clipToKeycapId!
    const pos = posByKey.get(kid)
    const km = templateKeys[kid]
    if (!pos || !km) continue

    const tx = pos.top_face_x, ty = pos.top_face_y
    const tw = pos.top_face_w, th = pos.top_face_h
    const trx = pos.top_face_rx ?? 0
    if (tx == null || ty == null || tw == null || th == null) continue

    const dTopW = km.w * baseUnit - KEYCAP_GAP - KEY_PAD_LEFT - KEY_PAD_RIGHT
    const dTopH = km.h * baseUnit - KEYCAP_GAP - KEY_PAD_TOP - KEY_PAD_BOTTOM
    const dTopX = km.x * baseUnit + KEYCAP_GAP / 2 + KEY_PAD_LEFT
    const dTopY = km.y * baseUnit + KEYCAP_GAP / 2 + KEY_PAD_TOP

    const imgSvgX = img.x - ART_PAD
    const imgSvgY = img.y - ART_PAD
    const relX = imgSvgX - dTopX
    const relY = imgSvgY - dTopY

    const sx = dTopW ? tw / dTopW : topScale
    const sy = dTopH ? th / dTopH : topScale

    const jigImgX = tx + relX * sx
    const jigImgY = ty + relY * sy
    const jigImgW = img.width * sx
    const jigImgH = img.height * sy

    let clipRect: [number, number, number, number, number]
    if (img.clipToTopFace) {
      clipRect = [tx, ty, tw, th, trx]
    } else {
      const bx = pos.bottom_box_x, by = pos.bottom_box_y
      const bw = pos.bottom_box_w, bh = pos.bottom_box_h
      if (bx != null && by != null && bw != null && bh != null) {
        clipRect = [bx, by, bw, bh, 0]
      } else {
        clipRect = [tx, ty, tw, th, trx]
      }
    }

    const clipId = `clip-jig-img-${clipIdx++}`
    emitImageElement(
      defsLines, lines, clipId, clipRect,
      [jigImgX, jigImgY, jigImgW, jigImgH],
      img.rotation ?? 0, img.opacity ?? 1, img.src ?? "",
      kid, imageCache, svgCache,
    )
  }

  lines.push("</g>")
  return { layerSvg: lines.join("\n"), defsContent: defsLines.join("\n") }
}

// ─── 全局画布图片图层 ─────────────────────────────────────────────────────

function buildCanvasGlobalImageLayer(
  canvasElements: CanvasElement[],
  positions: JigPosition[],
  layout: Layout,
  topScale: number,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): ImageLayerResult {
  const globalImgs = canvasElements.filter(
    el => el.type === "image" && !el.clipToKeycapId,
  )
  if (globalImgs.length === 0) return { layerSvg: "", defsContent: "" }

  const { keys: templateKeys, baseUnit } = layout
  const posByKey = buildPosByKey(positions, templateKeys)
  const lines: string[] = ['<g id="jig-global-image-layer">']
  const defsLines: string[] = []
  let clipIdx = 0

  for (const img of globalImgs) {
    const imgSvgX = img.x - ART_PAD
    const imgSvgY = img.y - ART_PAD
    const imgW = img.width
    const imgH = img.height

    for (const [kid, km] of Object.entries(templateKeys)) {
      const pos = posByKey.get(kid)
      if (!pos) continue

      const dKeyX = km.x * baseUnit + KEYCAP_GAP / 2
      const dKeyY = km.y * baseUnit + KEYCAP_GAP / 2
      const dKeyW = km.w * baseUnit - KEYCAP_GAP
      const dKeyH = km.h * baseUnit - KEYCAP_GAP

      // AABB 相交检测
      if (
        imgSvgX + imgW <= dKeyX || imgSvgX >= dKeyX + dKeyW ||
        imgSvgY + imgH <= dKeyY || imgSvgY >= dKeyY + dKeyH
      ) continue

      const bbx = pos.base_box_x, bby = pos.base_box_y
      const bbw = pos.base_box_w, bbh = pos.base_box_h
      if (bbx == null || bby == null || bbw == null || bbh == null) continue

      // 坐标映射仍基于底座框（base_box）比例，保持与底座框内图案位置一致
      const sx = dKeyW ? bbw / dKeyW : topScale
      const sy = dKeyH ? bbh / dKeyH : topScale

      const relX = imgSvgX - dKeyX
      const relY = imgSvgY - dKeyY
      const jigImgX = bbx + relX * sx
      const jigImgY = bby + relY * sy
      const jigImgW = imgW * sx
      const jigImgH = imgH * sy

      // 剪切范围扩展到底色框（bottom_box），回退到底座框
      const btx = pos.bottom_box_x, bty = pos.bottom_box_y
      const btw = pos.bottom_box_w, bth = pos.bottom_box_h
      const clipRect: [number, number, number, number, number] =
        btx != null && bty != null && btw != null && bth != null
          ? [btx, bty, btw, bth, 0]
          : [bbx, bby, bbw, bbh, pos.base_box_rx ?? 0]

      const clipId = `clip-jig-gimg-${clipIdx++}`
      emitImageElement(
        defsLines, lines, clipId,
        clipRect,
        [jigImgX, jigImgY, jigImgW, jigImgH],
        img.rotation ?? 0, img.opacity ?? 1, img.src ?? "",
        kid, imageCache, svgCache,
      )
    }
  }

  lines.push("</g>")
  return { layerSvg: lines.join("\n"), defsContent: defsLines.join("\n") }
}

// ─── SVG 内联工具 ─────────────────────────────────────────────────────────

/** 判断 src 是否为 SVG data URL */
function isSvgDataUrl(src: string): boolean {
  return src.startsWith("data:image/svg+xml")
}

/** 解码 SVG data URL（支持 base64 和 percent-encoded） */
function decodeSvgSrc(src: string): string | null {
  try {
    const comma = src.indexOf(",")
    if (comma === -1) return null
    const meta = src.slice(0, comma)
    const data = src.slice(comma + 1)
    if (meta.includes("base64")) {
      return Buffer.from(data, "base64").toString("utf-8")
    }
    return decodeURIComponent(data)
  } catch {
    return null
  }
}

/** 解析 SVG 的 viewBox（x, y, w, h） */
function getSvgViewBox(svgText: string): { x: number; y: number; w: number; h: number } {
  const vb = svgText.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/,
  )
  if (vb?.[1] && vb?.[2] && vb?.[3] && vb?.[4]) return { x: +vb[1], y: +vb[2], w: +vb[3], h: +vb[4] }
  const wm = svgText.match(/<svg[^>]*\bwidth\s*=\s*["']([\d.]+)/)
  const hm = svgText.match(/<svg[^>]*\bheight\s*=\s*["']([\d.]+)/)
  if (wm?.[1] && hm?.[1]) return { x: 0, y: 0, w: +wm[1], h: +hm[1] }
  return { x: 0, y: 0, w: 100, h: 100 }
}

/** 找到开头 <svg ...> 的结束位置（正确处理引号内的 > 字符） */
function findSvgOpenTagEnd(svgText: string): number {
  const start = svgText.indexOf("<svg")
  if (start === -1) return -1
  let i = start + 4
  let inQuote: string | null = null
  while (i < svgText.length) {
    const c = svgText[i]
    if (inQuote) {
      if (c === inQuote) inQuote = null
    } else if (c === '"' || c === "'") {
      inQuote = c
    } else if (c === ">") {
      return i
    }
    i++
  }
  return -1
}


/**
 * 对 SVG 内容中所有 id 和对应引用加上唯一前缀，防止多个内联 SVG id 冲突。
 */
function namespaceSvgIds(content: string, prefix: string): string {
  let r = content.replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
  r = r.replace(/url\(#([^)]+)\)/g, (_, ref) => `url(#${prefix}-${ref})`)
  r = r.replace(/\bhref="#([^"]+)"/g, (_, ref) => `href="#${prefix}-${ref}"`)
  r = r.replace(/xlink:href="#([^"]+)"/g, (_, ref) => `xlink:href="#${prefix}-${ref}"`)
  return r
}

/**
 * 对 CSS 文本中所有规则的选择器加上 `scopePrefix` 前缀，实现 CSS 作用域隔离。
 * 防止用户上传的 SVG 内的 <style> 污染治具 SVG 的全局样式。
 * 处理范围：普通规则块（不处理 @keyframes 等 at-rules，直接原样保留）。
 *
 * @param scopePrefix 完整的 CSS 选择器前缀，例如 `"#my-id"` 或 `".my-class"`
 */
function scopeCssSelectors(css: string, scopePrefix: string): string {
  // 去掉注释
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
  // 逐条处理规则：选择器 { 声明 }
  // @keyframes / @media 等 at-rule 直接保留（不加前缀）
  return noComments.replace(/((?:[^{@])+)\{([^}]*)\}/g, (_, selector, rules) => {
    const trimmed = selector.trim()
    if (!trimmed) return `{${rules}}`
    const scoped = trimmed
      .split(",")
      .map((s: string) => `${scopePrefix} ${s.trim()}`)
      .join(", ")
    return `${scoped} {${rules}}`
  })
}

/**
 * 将 SVG 矢量内容直接内联到 defsLines / lines，替代 <image href="..."> 引用方式。
 * 确保在 Adobe Illustrator / AI 等工具中可见，并保持纯矢量。
 *
 * CSS 处理策略：
 *  - 从 SVG 中提取所有 <style> 块（包括 <defs> 内的）
 *  - 对每条选择器加 class 前缀，作用域隔离
 *  - 将作用域化的 <style> 注入到根 <defs>，非 style 的 <defs> 内容（渐变/滤镜等）同样注入
 *  - 包裹 <g> 添加对应 class 属性，使选择器匹配正确
 *
 * 相同 svgText 只在 <defs> 中生成一个 <symbol>，每个键帽实例通过
 * <use x y width height> 引用，避免 SVG body 重复写入。
 * <symbol> 利用 viewBox + preserveAspectRatio="none" 自动处理坐标缩放，
 * clipPath 始终加在无 transform 的外层 <g> 上，与 <use> 位置无关。
 */
function emitInlineSvg(
  defsLines: string[],
  lines: string[],
  clipId: string,
  clipRect: [number, number, number, number, number],
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  svgText: string,
  kidAttr = "",
  svgCache: Map<string, string>,
): void {
  const [ix, iy, iw, ih] = imgRect

  pushClipPathDef(defsLines, clipId, clipRect)
  const [opAttr, dkAttr] = makeOpDkAttrs(opacity, kidAttr)

  // SVG body 封装为 <symbol>，只写一次；
  // CSS 处理原则：<style> 必须放在根 <defs>（symbol 外部），否则渲染器不会处理 symbol 内的样式。
  // 用 class 选择器（.svgsc-XXX）而非 ID，这样多个 <use> 实例可共享同一个 class，
  // 且外层 <g class="svgsc-XXX"> 的 CSS 可通过 SVG 1.1 级联到 <use> 实例内部。
  let symbolId = svgCache.get(svgText)
  if (!symbolId) {
    symbolId = `jig-svg-sym-${svgCache.size}`
    svgCache.set(svgText, symbolId)

    const vb = getSvgViewBox(svgText)
    const openTagEnd = findSvgOpenTagEnd(svgText)
    if (openTagEnd !== -1) {
      const closeStart = svgText.lastIndexOf("</svg>")
      const rawInner = closeStart !== -1
        ? svgText.slice(openTagEnd + 1, closeStart)
        : svgText.slice(openTagEnd + 1)

      const cssClass = `svgsc-${symbolId}`
      const scopedStyleChunks: string[] = []
      const innerNoStyle = rawInner.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (_, css: string) => {
        scopedStyleChunks.push(scopeCssSelectors(css, `.${cssClass}`))
        return ""
      })

      const defsChunks: string[] = []
      const defsRe = /<defs[^>]*>([\s\S]*?)<\/defs>/g
      let dm: RegExpExecArray | null
      while ((dm = defsRe.exec(innerNoStyle)) !== null) {
        if (dm[1] != null) defsChunks.push(dm[1])
      }
      const innerDefsContent = defsChunks.join("\n")

      const bodyOnly = innerNoStyle
        .replace(/<defs[^>]*>[\s\S]*?<\/defs>/g, "")
        .replace(/<\?xml[^?]*\?>/g, "")
        .trim()

      const nsBody = namespaceSvgIds(bodyOnly, symbolId)
      const nsDefsContent = innerDefsContent.trim()
        ? namespaceSvgIds(innerDefsContent, symbolId)
        : ""

      // CSS 写到 symbol 外部（根 defs 级别），确保渲染器能正确处理
      if (scopedStyleChunks.length > 0) {
        defsLines.push(
          `    <style>${namespaceSvgIds(scopedStyleChunks.join("\n"), symbolId)}</style>`,
        )
      }

      // <symbol> 只包含图形 defs 和 body，不含 <style>
      defsLines.push(
        `    <symbol id="${symbolId}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" ` +
        `preserveAspectRatio="none">`,
      )
      if (nsDefsContent) {
        defsLines.push(`      <defs>${nsDefsContent}</defs>`)
      }
      defsLines.push(nsBody)
      defsLines.push(`    </symbol>`)
    }
  }

  // 每个实例只输出 <use>；
  // 外层 <g> 加上 class="svgsc-${symbolId}"，使 CSS 选择器能级联进 <use> 实例内部
  const cssClass = `svgsc-${symbolId}`
  const clsAttr = ` class="${cssClass}"`
  const useEl =
    `<use xlink:href="#${symbolId}" href="#${symbolId}" ` +
    `x="${ix.toFixed(4)}" y="${iy.toFixed(4)}" ` +
    `width="${iw.toFixed(4)}" height="${ih.toFixed(4)}"/>`

  if (rotation) {
    const cx_ = ix + iw / 2
    const cy_ = iy + ih / 2
    lines.push(
      `  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}${clsAttr}>` +
      `<g transform="rotate(${rotation},${cx_.toFixed(4)},${cy_.toFixed(4)})">` +
      `${useEl}</g></g>`,
    )
  } else {
    lines.push(
      `  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}${clsAttr}>${useEl}</g>`,
    )
  }
}

/**
 * 统一分发：根据 src 是否为 SVG data URL 决定调用 emitInlineSvg 或 emitImage。
 */
function emitImageElement(
  defsLines: string[],
  lines: string[],
  clipId: string,
  clipRect: [number, number, number, number, number],
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  src: string,
  kid: string,
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): void {
  if (isSvgDataUrl(src)) {
    const svgText = decodeSvgSrc(src)
    if (svgText) {
      emitInlineSvg(defsLines, lines, clipId, clipRect, imgRect, rotation, opacity, svgText, kid, svgCache)
      return
    }
  }
  emitImage(defsLines, lines, clipId, clipRect, imgRect, rotation, opacity, src, kid, imageCache)
}

// ─── 图层注入 ─────────────────────────────────────────────────────────────

/**
 * 确保根 <svg> 标签含有 xmlns:xlink 声明，供 Illustrator 识别 xlink:href。
 */
function ensureXlinkNamespace(svgText: string): string {
  if (svgText.includes("xmlns:xlink")) return svgText
  return svgText.replace(/<svg\b/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
}

/**
 * 将 clipPath 等定义内容注入到根 <defs> 块内部（</defs> 之前）。
 * 若根节点无 <defs>，则在 SVG 根标签结束后创建一个。
 */
function injectIntoDefs(svgText: string, defsContent: string): string {
  if (!defsContent.trim()) return svgText

  const defsEnd = svgText.indexOf("</defs>")
  if (defsEnd !== -1) {
    return svgText.slice(0, defsEnd) + defsContent + "\n  " + svgText.slice(defsEnd)
  }

  // 无 <defs> 块时，在根标签 > 之后插入
  const svgTagEnd = svgText.indexOf(">")
  if (svgTagEnd === -1) return svgText
  return (
    svgText.slice(0, svgTagEnd + 1) +
    `\n  <defs>\n${defsContent}\n  </defs>` +
    svgText.slice(svgTagEnd + 1)
  )
}

function injectLayers(svgText: string, ...layerSvgs: string[]): string {
  const nonEmpty = layerSvgs.filter(Boolean)
  if (nonEmpty.length === 0) return svgText

  const defsEnd = svgText.indexOf("</defs>")
  let insertPos: number
  if (defsEnd !== -1) {
    insertPos = defsEnd + "</defs>".length
  } else {
    const firstPath = svgText.indexOf("<path")
    if (firstPath === -1) {
      throw new Error("SVG 中未找到 <defs> 或 <path>，无法注入图层")
    }
    insertPos = firstPath
  }

  const insert = "\n" + nonEmpty.join("\n") + "\n"
  return svgText.slice(0, insertPos) + insert + svgText.slice(insertPos)
}

// ─── 公共入口 ─────────────────────────────────────────────────────────────

/**
 * 根据设计 JSON 生成治具 SVG 字符串。
 * 文字使用 opentype.js 转曲为 <path>，CJK 字体降级保留 <text>。
 */
export async function generateJigSvg(design: DesignPayload): Promise<string> {
  // 1. 解析设计数据
  const parsedDesign = parseDesign(design)

  // 2. 加载模板布局
  const layout = parsedDesign.templateId
    ? loadTemplateLayout(parsedDesign.templateId)
    : { keys: {}, baseUnit: 54 }

  // 3. 读取治具位置
  const positionsPath = path.join(
    process.cwd(),
    "modules/design/data/jig/keycap_jig_positions.json",
  )
  if (!fs.existsSync(positionsPath)) {
    throw new Error(`治具位置文件不存在: ${positionsPath}`)
  }
  const positions: JigPosition[] = JSON.parse(fs.readFileSync(positionsPath, "utf-8"))

  // 4. 计算比例因子
  const topScale = computeJigTopScale(positions, layout.baseUnit)

  // 5. 读取治具基础 SVG
  const jigSvgPath = path.join(
    process.cwd(),
    "modules/design/data/jig/keycap_jig.svg",
  )
  if (!fs.existsSync(jigSvgPath)) {
    throw new Error(`治具 SVG 文件不存在: ${jigSvgPath}`)
  }
  let svgText = fs.readFileSync(jigSvgPath, "utf-8")

  // 6. 构建颜色层 + 收集文字描述符
  const intermediate = buildDesignLayersIntermediate(positions, parsedDesign, layout, topScale)

  // 7. 将文字描述符转曲为路径，生成标签层
  const labelLayer = await buildLabelLayer(intermediate)
  const colorLayer = intermediate.colorLayer

  // 8. 图片图层（两个函数共享同一组缓存，确保跨图层的相同资源只写一份）
  const imageCache = new Map<string, string>()
  const svgCache = new Map<string, string>()
  const imgLayerResult = buildCanvasImageLayer(parsedDesign.canvasElements, positions, layout, topScale, imageCache, svgCache)
  const globalImgLayerResult = buildCanvasGlobalImageLayer(parsedDesign.canvasElements, positions, layout, topScale, imageCache, svgCache)

  // 9. 将所有 clipPath 定义统一注入根 <defs>，避免 <defs> 散落在 <g> 内部
  const allDefsContent = [imgLayerResult.defsContent, globalImgLayerResult.defsContent]
    .filter(Boolean)
    .join("\n")
  svgText = injectIntoDefs(svgText, allDefsContent)

  // 10. 确保根 <svg> 声明 xmlns:xlink，供 Illustrator 识别 xlink:href
  svgText = ensureXlinkNamespace(svgText)

  // 11. 注入图层（颜色层 → 全局图片层 → 单键帽图片层 → 文字层 → 治具结构线）
  svgText = injectLayers(
    svgText,
    colorLayer,
    globalImgLayerResult.layerSvg,
    imgLayerResult.layerSvg,
    labelLayer,
  )

  return svgText
}
