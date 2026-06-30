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
import {
  roundedPolygonPath,
  getIsoTopFaceRadii,
  getTopFaceRects,
} from "@/modules/design/lib/design/keycapGeometry"

// ─── 几何常量（与 keycapGeometry.ts / Python 脚本保持同步）─────────────────
const KEYCAP_GAP = 2
const KEY_PAD_LEFT = 11
const KEY_PAD_TOP = 6
const KEY_PAD_RIGHT = 11
const KEY_PAD_BOTTOM = 10
const KEY_LABEL_SIZE = 7
const KEY_LABEL_OPTICAL_CENTER_RATIO = 0.09
const ART_PAD = 28
const KEY_RADIUS_BASE_ISO = 1.5
const KEY_RADIUS_TOP = 4

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
  shape?: string
}

interface Layout {
  keys: Record<string, LayoutKey>
  baseUnit: number
}

interface JigPoint {
  x: number
  y: number
}

interface JigPosition {
  key_id: string
  unit?: number
  row_level?: string
  shape?: string
  geometry_group?: string
  /** 矩形顶面（普通键） */
  top_face_x?: number
  top_face_y?: number
  top_face_w?: number
  top_face_h?: number
  top_face_rx?: number
  /** 多边形顶面（ISO Enter 等异形键） */
  top_face_points?: JigPoint[]
  /** 矩形底色框（普通键） */
  bottom_box_x?: number
  bottom_box_y?: number
  bottom_box_w?: number
  bottom_box_h?: number
  /** 多边形底座（ISO Enter 等异形键） */
  base_points?: JigPoint[]
  base_box_x?: number
  base_box_y?: number
  base_box_w?: number
  base_box_h?: number
  base_box_rx?: number
  /** 标签中心（异形键显式提供，优先于计算值） */
  label_cx?: number
  label_cy?: number
  centroid_cx?: number
  centroid_cy?: number
}

// ─── 增补键 ID 解码 ────────────────────────────────────────────────────────

/**
 * 治具查找参数：由 resolveJigLookup 从布局 keyId 中解码。
 */
interface JigLookupParams {
  /** 治具 positions 中对应的 key_id 值（匿名槽为空字符串） */
  baseId: string
  /** 精确 unit 约束（解码后的小数值） */
  unit?: number
  /** 行级约束（R1~R4） */
  rowLevel?: string
  /** 形状约束（如 "stepped"） */
  shape?: string
  /** geometry_group 精确匹配（ISO Enter 等多槽组合键） */
  geometryGroup?: string
  /** 是否为匿名自定义槽（KC_CUST_* 系列） */
  isAnonymous?: boolean
}

/**
 * 将布局中的 keyId 解码为治具查找参数。
 *
 * 增补键后缀约定：
 *   _ISO       → geometry_group = "{keyId}_1"（KC_ENT_ISO → geometry_group=KC_ENT_ISO_1）
 *   _STEP      → shape = "stepped"
 *   KC_CUST_*  → isAnonymous，匹配 key_id="" 的匿名槽，按行按序消费
 *   _nnn (3位) → unit = n/100（225→2.25, 175→1.75, 150→1.50, 125→1.25）
 *   _nU        → unit = n 整数（7U→7, 2U→2）
 *   _Rn        → rowLevel = "Rn", unit = 1（_R4 → rowLevel="R4"）
 *   无后缀     → 标准键，直接按 key_id 精确查找
 */
function resolveJigLookup(keyId: string): JigLookupParams {
  // ISO 多槽组合（KC_ENT_ISO → geometry_group="KC_ENT_ISO_1"）
  const isoMatch = keyId.match(/^(.+)_ISO$/)
  if (isoMatch?.[1]) return { baseId: isoMatch[1], geometryGroup: `${keyId}_1` }

  // stepped 形状
  if (keyId.endsWith("_STEP")) return { baseId: keyId.slice(0, -5), shape: "stepped" }

  // 匿名自定义槽：KC_CUST_R2 / KC_CUST_R1_A / KC_CUST_R1_B
  if (keyId.startsWith("KC_CUST_")) {
    const rowMatch = keyId.match(/_R(\d)/)
    return { baseId: "", rowLevel: rowMatch ? `R${rowMatch[1]}` : undefined, isAnonymous: true }
  }

  // 3 位数字后缀 → 小数 unit（225→2.25, 175→1.75, 150→1.50, 125→1.25）
  const unitFrac = keyId.match(/_(\d{3})$/)
  if (unitFrac?.[0] && unitFrac[1]) {
    return {
      baseId: keyId.slice(0, keyId.length - unitFrac[0].length),
      unit: parseInt(unitFrac[1]) / 100,
    }
  }

  // 整数 nU 后缀（7U→7, 2U→2）
  const unitInt = keyId.match(/_(\d+)U$/)
  if (unitInt?.[0] && unitInt[1]) {
    return {
      baseId: keyId.slice(0, keyId.length - unitInt[0].length),
      unit: parseInt(unitInt[1]),
    }
  }

  // _Rn 后缀 → rowLevel = "Rn", unit = 1
  const rowSuffix = keyId.match(/_R(\d)$/)
  if (rowSuffix) {
    return {
      baseId: keyId.slice(0, keyId.length - rowSuffix[0].length),
      rowLevel: `R${rowSuffix[1]}`,
      unit: 1,
    }
  }

  // 标准键：直接按 key_id 精确查找
  return { baseId: keyId }
}

/**
 * 为每个模板键分配对应的治具位置，返回 position → 模板 keyId 的映射。
 *
 * 分配策略：
 *  - geometry_group 多槽键（ISO Enter）：整组全部纳入，均映射到该模板 keyId。
 *  - 匿名自定义槽（KC_CUST_*）：按 row_level、按模板中的出现顺序（游标）依次消费。
 *  - 普通键 / 增补键：在候选条目中取 unit 最接近的未分配条目（已分配的跳过），
 *    自然实现「先出现的优先 / 左先右后」原则，同时避免两个增补变体竞争同一槽位。
 *  - rowLevel：优先使用解码得到的约束，降级到布局键自身的 rowLevel。
 *  - 无模板时：按 key_id 唯一化保留首条（兼容旧逻辑）。
 */
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

  // geometry_group → positions[]
  const groupMap = new Map<string, JigPosition[]>()
  for (const pos of positions) {
    const gg = pos.geometry_group
    if (gg) {
      if (!groupMap.has(gg)) groupMap.set(gg, [])
      groupMap.get(gg)!.push(pos)
    }
  }

  // 匿名槽（key_id=""）按 row_level 分组，保持 positions 原始顺序
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

    // 1. geometry_group 多槽组合键（如 ISO Enter）
    if (params.geometryGroup) {
      const group = groupMap.get(params.geometryGroup)
      if (group) {
        for (const pos of group) assignment.set(pos, templateKeyId)
      }
      continue
    }

    // 2. 匿名自定义槽（KC_CUST_*）
    if (params.isAnonymous) {
      const row = params.rowLevel ?? ""
      const cursor = anonCursors.get(row) ?? 0
      const slots = anonByRow.get(row)
      const slot = slots?.[cursor]
      if (slot) {
        assignment.set(slot, templateKeyId)
        anonCursors.set(row, cursor + 1)
      }
      continue
    }

    // 3. 普通键 / 增补键：取 unit 最接近的未分配条目
    //    跨行键（h>1，如小键盘 + / Enter）在 jig 中 unit 记录的是高度跨度而非宽度，
    //    且 row_level 可能指向底部行，因此对此类键跳过 rowLevel 过滤并用 km.h 匹配 unit。
    const isTallKey = !params.unit && km.h > 1
    const effectiveRowLevel = params.rowLevel ?? (isTallKey ? undefined : km.rowLevel)
    const hasExplicitUnit = params.unit != null
    const targetUnit = params.unit ?? (isTallKey ? km.h : km.w)

    let best: JigPosition | null = null
    let bestDelta = Infinity

    for (const pos of positions) {
      if (pos.key_id !== params.baseId) continue
      if (pos.geometry_group) continue          // 组合槽只走 geometry_group 路径
      if (assignment.has(pos)) continue         // 已分配：跳过（先出现优先）
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

// ─── 设计顶面参考矩形（与设计器 KeycapEditorModal 保持一致）──────────────

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

// ─── 竖键横放检测 ─────────────────────────────────────────────────────────

/**
 * 判断某键是否在治具中被旋转了 90°（设计区竖向，治具槽横向）。
 * KC_PPLS / KC_PENT 等跨行键在设计区 h > w，在治具 top_face 中 w > h。
 */
function isJigRotated(km: LayoutKey, pos: JigPosition): boolean {
  if (km.h <= km.w) return false
  const jw = pos.top_face_w ?? pos.bottom_box_w
  const jh = pos.top_face_h ?? pos.bottom_box_h
  if (jw == null || jh == null) return false
  return jw > jh
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

/** 将点列序列化为 SVG polygon points 属性字符串 */
function jigPointsToStr(pts: JigPoint[]): string {
  return pts.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(" ")
}

/**
 * 计算点列的包围盒（bounding box）
 */
function pointsBBox(pts: JigPoint[]): { x: number; y: number; w: number; h: number } {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/**
 * 渲染 SVG 多边形色块
 */
function svgPolygon(pts: JigPoint[], fill: string, extra = ""): string {
  let attrs = `points="${jigPointsToStr(pts)}" fill="${fill}"`
  if (extra) attrs += ` ${extra}`
  return `  <polygon ${attrs}/>`
}

/**
 * 向 defsLines 写入多边形 clipPath 定义
 */
function pushPolygonClipPathDef(
  defsLines: string[],
  clipId: string,
  pts: JigPoint[],
): void {
  defsLines.push(`    <clipPath id="${clipId}">`)
  defsLines.push(`      <polygon points="${jigPointsToStr(pts)}"/>`)
  defsLines.push(`    </clipPath>`)
}

/**
 * 渲染带圆角的 SVG 多边形色块（用 <path> 替代 <polygon>）
 */
function svgRoundedPolygon(pts: JigPoint[], r: number | number[], fill: string, extra = ""): string {
  const d = roundedPolygonPath(pts, r)
  let attrs = `d="${d}" fill="${fill}"`
  if (extra) attrs += ` ${extra}`
  return `  <path ${attrs}/>`
}

/**
 * 向 defsLines 写入带圆角的多边形 clipPath 定义
 */
function pushRoundedPolygonClipPathDef(
  defsLines: string[],
  clipId: string,
  pts: JigPoint[],
  r: number | number[],
): void {
  const d = roundedPolygonPath(pts, r)
  defsLines.push(`    <clipPath id="${clipId}">`)
  defsLines.push(`      <path d="${d}"/>`)
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
  /** 需要旋转的 descriptor ID → 旋转中心和角度（竖键横放治具槽专用） */
  textRotations: Map<string, { cx: number; cy: number; angle: number }>
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
  const textRotations = new Map<string, { cx: number; cy: number; angle: number }>()

  // 为每个模板键分配治具位置（含增补键解码、匿名槽游标、先出现优先逻辑）
  const assignment = buildJigAssignment(positions, templateKeys)
  const skipped = positions.length - assignment.size

  // 跟踪已渲染过文字的 keyId，避免 geometry_group 键（如 ISO Enter）在多个 top_face 上重复印字
  const labelRenderedKeys = new Set<string>()

  for (const [pos, keyId] of assignment) {
    const defaultLabel = templateKeys[keyId]?.label ?? ""
    const st = getKeyStyle(keyId, design, defaultLabel)

    // ── 底色层（矩形 or 多边形）──────────────────────────────────────────
    const bx = pos.bottom_box_x, by = pos.bottom_box_y
    const bw = pos.bottom_box_w, bh = pos.bottom_box_h
    if (bx != null && by != null && bw != null && bh != null) {
      colorLines.push(svgRect(bx, by, bw, bh, st.bgColor,
        0, `data-key="${keyId}" data-layer="bottom"`))
    } else if (pos.base_points && pos.base_points.length > 0) {
      colorLines.push(svgRoundedPolygon(pos.base_points,
        KEY_RADIUS_BASE_ISO * topScale, st.bgColor,
        `data-key="${keyId}" data-layer="bottom"`))
    }

    // ── 顶面层（矩形 or 多边形）+ 文字 ────────────────────────────────────
    const tx = pos.top_face_x, ty = pos.top_face_y
    const tw = pos.top_face_w, th = pos.top_face_h
    const trx = pos.top_face_rx ?? 0
    const hasTopRect = tx != null && ty != null && tw != null && th != null
    const hasTopPoly = !hasTopRect && Array.isArray(pos.top_face_points) && pos.top_face_points.length > 0

    if (hasTopRect) {
      colorLines.push(svgRect(tx!, ty!, tw!, th!, st.topColor,
        trx, `data-key="${keyId}" data-layer="top"`))
    } else if (hasTopPoly) {
      colorLines.push(svgRoundedPolygon(pos.top_face_points!, getIsoTopFaceRadii(KEY_RADIUS_TOP * topScale), st.topColor,
        `data-key="${keyId}" data-layer="top"`))
    }

    // ── 文字（矩形或多边形顶面均可）──────────────────────────────────────
    if (hasTopRect || hasTopPoly) {
      // 同一 keyId 仅在首个 top_face（主印字区）渲染一次
      const alreadyLabeled = labelRenderedKeys.has(keyId)
      if (st.labelText && !alreadyLabeled) {
        labelRenderedKeys.add(keyId)
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

        // 标签中心：矩形顶面取几何中心；多边形顶面优先使用 label_cx/cy，
        // 其次使用包围盒中心（仅当无矩形顶面时才走多边形路径）。
        let cx: number, blockCenterY: number
        let rotCx: number, rotCy: number
        if (hasTopRect) {
          cx = tx! + tw! / 2 + offx
          blockCenterY = ty! + th! / 2 + offy - opticalY
          rotCx = tx! + tw! / 2
          rotCy = ty! + th! / 2
        } else {
          // 多边形：使用显式 label_cx/cy（最准确），否则取包围盒中心
          const bbox = pointsBBox(pos.top_face_points!)
          cx = (pos.label_cx ?? (bbox.x + bbox.w / 2)) + offx
          blockCenterY = (pos.label_cy ?? (bbox.y + bbox.h / 2)) + offy - opticalY
          rotCx = pos.label_cx ?? (bbox.x + bbox.w / 2)
          rotCy = pos.label_cy ?? (bbox.y + bbox.h / 2)
        }
        // firstLineCenterY：第一行的视觉中心（CJK <text> tspan 用）
        const cy = blockCenterY - multiY

        // 竖键横放检测：治具槽旋转 90° 时需对文字做对应旋转
        const km = templateKeys[keyId]
        const jigRotated = km != null && isJigRotated(km, pos)
        const rotTransform = jigRotated
          ? ` transform="rotate(-90,${rotCx.toFixed(4)},${rotCy.toFixed(4)})"`
          : ""

        // 判断是否 CJK
        const fontFile = resolveFontFile(st.fontFamily)
        if (fontFile === null) {
          // CJK 降级：直接输出 <text>（竖键横放时追加 transform）
          const ff = resolveFontFamily(st.fontFamily)
          const lc = st.labelColor
          const lsAttr = ls ? ` letter-spacing="${ls.toFixed(4)}"` : ""
          const tAttrs = `x="${cx.toFixed(4)}" y="${cy.toFixed(4)}" ` +
            `font-size="${fs_.toFixed(4)}" fill="${lc}" ` +
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
          // 竖键横放：记录旋转信息，在 buildLabelLayer 中包裹 <g transform>
          if (jigRotated) {
            textRotations.set(descId, { cx: rotCx, cy: rotCy, angle: -90 })
          }
        }
      }
    }
  }

  if (skipped > 0) {
    colorLines.splice(1, 0, `  <!-- ${skipped} jig position(s) skipped (not in template / unmatched params) -->`)
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
      const rot = intermediate.textRotations.get(r.id)
      if (rot) {
        // 竖键横放：将文字路径旋转到与治具槽方向一致
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
  const assignment = buildJigAssignment(positions, templateKeys)
  const map = new Map<string, JigPosition>()
  for (const [pos, kid] of assignment) {
    // geometry_group 键有多个 position 共享同一 kid，只保留首条（用于图片裁剪）
    if (!map.has(kid)) map.set(kid, pos)
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

/**
 * 使用已外部写入 defs 的 clipPath 渲染图片（不再写入 clipPath 定义）。
 * 适用于多边形 clipPath 等自定义裁剪形状。
 */
function emitImageWithCustomClip(
  defsLines: string[],
  lines: string[],
  clipId: string,
  imgRect: [number, number, number, number],
  rotation: number,
  opacity: number,
  src: string,
  kidAttr = "",
  imageCache: Map<string, string>,
  svgCache: Map<string, string>,
): void {
  if (isSvgDataUrl(src)) {
    const svgText = decodeSvgSrc(src)
    if (svgText) {
      // emitInlineSvg 会再次写入 clipPath，这里需要跳过它——
      // 直接使用已有 clipId 渲染 symbol，手动复制其核心逻辑
      const [ix, iy, iw, ih] = imgRect
      const [opAttr, dkAttr] = makeOpDkAttrs(opacity, kidAttr)
      let symbolId = svgCache.get(svgText)
      if (!symbolId) {
        // 让 emitInlineSvg 负责写入 symbol（需要传一个临时 clipId 占位，后不使用其 clipPath 输出）
        const tempDefsLines: string[] = []
        const tempLines: string[] = []
        emitInlineSvg(tempDefsLines, tempLines, `__tmp_${clipId}`, [0,0,1,1,0], imgRect, rotation, opacity, svgText, kidAttr, svgCache)
        // 提取 symbol 定义（跳过 clipPath 部分）
        for (const line of tempDefsLines) {
          if (!line.includes(`id="__tmp_${clipId}"`)) defsLines.push(line)
        }
        symbolId = svgCache.get(svgText)!
      }
      const cssClass = `svgsc-${symbolId}`
      const useEl = `<use xlink:href="#${symbolId}" href="#${symbolId}" ` +
        `x="${ix.toFixed(4)}" y="${iy.toFixed(4)}" ` +
        `width="${iw.toFixed(4)}" height="${ih.toFixed(4)}"/>`
      if (rotation) {
        const cx_ = ix + iw / 2; const cy_ = iy + ih / 2
        lines.push(`  <g clip-path="url(#${clipId})"${opAttr}${dkAttr} class="${cssClass}">` +
          `<g transform="rotate(${rotation},${cx_.toFixed(4)},${cy_.toFixed(4)})">${useEl}</g></g>`)
      } else {
        lines.push(`  <g clip-path="url(#${clipId})"${opAttr}${dkAttr} class="${cssClass}">${useEl}</g>`)
      }
      return
    }
  }
  // 非 SVG：复用 emitImage 逻辑，但 clipPath 已在外部写入
  const [ix, iy, iw, ih] = imgRect
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
  const cx_ = ix + iw / 2; const cy_ = iy + ih / 2
  const rotatePart = rotation ? `rotate(${rotation},${cx_.toFixed(4)},${cy_.toFixed(4)}) ` : ""
  const transformAttr = `transform="${rotatePart}translate(${ix.toFixed(4)},${iy.toFixed(4)}) scale(${iw.toFixed(4)},${ih.toFixed(4)})"`
  lines.push(`  <g clip-path="url(#${clipId})"${opAttr}${dkAttr}>` +
    `<use ${transformAttr} xlink:href="#${resourceId}" href="#${resourceId}"/></g>`)
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

    // 解析顶面区域：优先矩形，降级到多边形包围盒
    let tx: number, ty: number, tw: number, th: number
    const trx = pos.top_face_rx ?? 0
    const topPts = pos.top_face_points
    if (pos.top_face_x != null && pos.top_face_y != null &&
        pos.top_face_w != null && pos.top_face_h != null) {
      tx = pos.top_face_x; ty = pos.top_face_y
      tw = pos.top_face_w; th = pos.top_face_h
    } else if (topPts && topPts.length > 0) {
      const bb = pointsBBox(topPts)
      tx = bb.x; ty = bb.y; tw = bb.w; th = bb.h
    } else {
      continue
    }

    const { x: dTopX, y: dTopY, w: dTopW, h: dTopH } =
      getDesignTopFaceRect(kid, km, baseUnit)

    const imgSvgX = img.x - ART_PAD
    const imgSvgY = img.y - ART_PAD

    let jigImgX: number, jigImgY: number, jigImgW: number, jigImgH: number
    let effectiveRotation = img.rotation ?? 0

    if (isJigRotated(km, pos)) {
      // 竖键横放（如数字键盘 + / Enter）：设计竖向，治具横向，坐标轴互换
      // CCW 90°（设计正面朝左放置）：设计 Y → 治具 X，设计 X → 治具 Y（取反）
      const sxH = dTopH ? tw / dTopH : topScale  // 设计高度轴 → 治具宽度轴
      const sxW = dTopW ? th / dTopW : topScale  // 设计宽度轴 → 治具高度轴
      const relX = imgSvgX - dTopX
      const relY = imgSvgY - dTopY
      const relCX = relX + img.width / 2
      const relCY = relY + img.height / 2
      const jigRelCX = relCY * sxH               // 设计 Y → 治具 X（同向）
      const jigRelCY = (dTopW - relCX) * sxW     // 设计 X → 治具 Y（取反）
      // 图片框保持竖向比例，旋转 -90° 后在治具槽中展开为横向
      jigImgW = img.width * sxW
      jigImgH = img.height * sxH
      jigImgX = tx + jigRelCX - jigImgW / 2
      jigImgY = ty + jigRelCY - jigImgH / 2
      effectiveRotation = (img.rotation ?? 0) - 90
    } else {
      const relX = imgSvgX - dTopX
      const relY = imgSvgY - dTopY
      const sx = dTopW ? tw / dTopW : topScale
      const sy = dTopH ? th / dTopH : topScale
      jigImgX = tx + relX * sx
      jigImgY = ty + relY * sy
      jigImgW = img.width * sx
      jigImgH = img.height * sy
    }

    const clipId = `clip-jig-img-${clipIdx++}`

    // 剪切区域：多边形键用圆角 path clipPath，矩形键用 rect clipPath
    if (img.clipToTopFace) {
      if (topPts && topPts.length > 0) {
        pushRoundedPolygonClipPathDef(defsLines, clipId, topPts, KEY_RADIUS_TOP * topScale)
        emitImageWithCustomClip(defsLines, lines, clipId,
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      } else {
        emitImageElement(defsLines, lines, clipId, [tx, ty, tw, th, trx],
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      }
    } else {
      const bx = pos.bottom_box_x, by = pos.bottom_box_y
      const bw = pos.bottom_box_w, bh = pos.bottom_box_h
      if (bx != null && by != null && bw != null && bh != null) {
        emitImageElement(defsLines, lines, clipId, [bx, by, bw, bh, 0],
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      } else if (pos.base_points && pos.base_points.length > 0) {
        // 多边形底座：使用圆角 path clipPath
        pushRoundedPolygonClipPathDef(defsLines, clipId, pos.base_points,
          KEY_RADIUS_BASE_ISO * topScale)
        emitImageWithCustomClip(defsLines, lines, clipId,
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      } else {
        emitImageElement(defsLines, lines, clipId, [tx, ty, tw, th, trx],
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      }
    }
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

      // 底座参考框：优先矩形 base_box，降级到 base_points 包围盒
      let bbx: number, bby: number, bbw: number, bbh: number
      const bpts = pos.base_points
      if (pos.base_box_x != null && pos.base_box_y != null &&
          pos.base_box_w != null && pos.base_box_h != null) {
        bbx = pos.base_box_x; bby = pos.base_box_y
        bbw = pos.base_box_w; bbh = pos.base_box_h
      } else if (bpts && bpts.length > 0) {
        const bb = pointsBBox(bpts)
        bbx = bb.x; bby = bb.y; bbw = bb.w; bbh = bb.h
      } else {
        continue
      }

      // 坐标映射基于底座框（base_box）比例
      // 竖键横放时互换高宽轴，确保比例和坐标方向与治具槽一致
      let jigImgX: number, jigImgY: number, jigImgW: number, jigImgH: number
      let effectiveRotation = img.rotation ?? 0

      if (isJigRotated(km, pos)) {
        // 竖键横放：设计高度轴 → 治具宽度轴；设计宽度轴 → 治具高度轴
        const sxH = dKeyH ? bbw / dKeyH : topScale
        const sxW = dKeyW ? bbh / dKeyW : topScale
        const relX = imgSvgX - dKeyX
        const relY = imgSvgY - dKeyY
        const relCX = relX + imgW / 2
        const relCY = relY + imgH / 2
        const jigRelCX = relCY * sxH               // 设计 Y → 治具 X
        const jigRelCY = (dKeyW - relCX) * sxW     // 设计 X → 治具 Y（取反）
        jigImgW = imgW * sxW
        jigImgH = imgH * sxH
        jigImgX = bbx + jigRelCX - jigImgW / 2
        jigImgY = bby + jigRelCY - jigImgH / 2
        effectiveRotation = (img.rotation ?? 0) - 90
      } else {
        const sx = dKeyW ? bbw / dKeyW : topScale
        const sy = dKeyH ? bbh / dKeyH : topScale
        const relX = imgSvgX - dKeyX
        const relY = imgSvgY - dKeyY
        jigImgX = bbx + relX * sx
        jigImgY = bby + relY * sy
        jigImgW = imgW * sx
        jigImgH = imgH * sy
      }

      const clipId = `clip-jig-gimg-${clipIdx++}`

      // 剪切范围：多边形键用 polygon clip；矩形键扩展到 bottom_box，回退到 base_box
      const btx = pos.bottom_box_x, bty = pos.bottom_box_y
      const btw = pos.bottom_box_w, bth = pos.bottom_box_h
      if (bpts && bpts.length > 0 && pos.base_box_x == null) {
        // 多边形底座：使用圆角 base_points path clipPath
        pushRoundedPolygonClipPathDef(defsLines, clipId, bpts,
          KEY_RADIUS_BASE_ISO * topScale)
        emitImageWithCustomClip(defsLines, lines, clipId,
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      } else {
        const clipRect: [number, number, number, number, number] =
          btx != null && bty != null && btw != null && bth != null
            ? [btx, bty, btw, bth, 0]
            : [bbx, bby, bbw, bbh, pos.base_box_rx ?? 0]
        emitImageElement(defsLines, lines, clipId, clipRect,
          [jigImgX, jigImgY, jigImgW, jigImgH],
          effectiveRotation, img.opacity ?? 1, img.src ?? "",
          kid, imageCache, svgCache)
      }
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

  // 判断是否有任意图层隐藏了文字——若有，治具图不输出 jig-label-layer
  const anyLabelsHidden = (design.layers ?? []).some((l) => l.labelsHidden === true)

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
  // 用 stripBom 去除 UTF-8 BOM（\uFEFF），防止 JSON.parse 因 BOM 报错
  const positions: JigPosition[] = JSON.parse(
    fs.readFileSync(positionsPath, "utf-8").replace(/^\uFEFF/, ""),
  )

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

  // 7. 将文字描述符转曲为路径，生成标签层；若任意图层隐藏了文字则跳过
  const labelLayer = anyLabelsHidden ? "" : await buildLabelLayer(intermediate)
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
