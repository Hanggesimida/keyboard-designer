import {
  useDesignUIStore,
  type CanvasImageElement,
  type CanvasElement,
  type GlobalKeycapStyle,
  type Layer,
  type LayerKeycapOverrides,
  TEMPLATES,
} from "@/modules/design/store/designUiStore"
import type { TemplateId } from "@/modules/design/store/designUiStore"
import { KEY_RADIUS_BASE, KEYCAP_GAP } from "@/modules/design/components/canvas/KeycapNode"
import type { KeyDef } from "@/modules/design/types/design"
import { FONT_ASSETS } from "@/lib/fontAssets"
import { normalizeFontFamilyRef } from "@/lib/fonts/fontRef"
import {
  textsToPaths,
  type TextDescriptor,
} from "@/lib/api/export"
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"

const SVG_NS = "http://www.w3.org/2000/svg"

export interface ExportArtboardParams {
  artboardEl: HTMLElement | null
  artW: number
  artH: number
  artPad: number
  unit: number
  keys: KeyDef[]
}

// ─── 转曲辅助工具 ──────────────────────────────────────────────────────────

/**
 * 解析 style 属性字符串中某个属性的值。
 * 例如 parseStyleProp("font-family: Inter; letter-spacing: 2px", "font-family") → "Inter"
 */
function parseStyleProp(styleAttr: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i")
  const m = styleAttr.match(re)
  return m && m[1] ? m[1].trim() : null
}

/**
 * 将 fill 值从 CSS var 解析为实际颜色字符串。
 * var(--xxx) 通过 document root 的 getComputedStyle 解析。
 * 无法解析时返回 "#000000"。
 */
function resolveFillColor(fill: string): string {
  if (!fill || fill === "currentColor" || fill === "none") return fill || "currentColor"
  if (fill.startsWith("var(")) {
    const varName = fill.slice(4).replace(/\)$/, "").trim()
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim()
    return resolved || "#000000"
  }
  return fill
}

/**
 * 解析序列化 SVG 字符串中的所有 <text> 元素，构建 TextDescriptor 数组。
 * 返回 descriptors 数组以及对应位置的元素数组（顺序一致）。
 */
function extractTextDescriptors(doc: Document): {
  descriptors: TextDescriptor[]
  elements: Element[]
  resolvedFills: string[]
} {
  const allTexts = Array.from(doc.querySelectorAll("text"))
  const descriptors: TextDescriptor[] = []
  const elements: Element[] = []
  const resolvedFills: string[] = []

  for (let i = 0; i < allTexts.length; i++) {
    const textEl = allTexts[i]
    if (!textEl) continue

    const x = parseFloat(textEl.getAttribute("x") ?? "0")
    const y = parseFloat(textEl.getAttribute("y") ?? "0")
    const fontSize = parseFloat(textEl.getAttribute("font-size") ?? "12")

    const styleAttr = textEl.getAttribute("style") ?? ""
    const fontFamily = normalizeFontFamilyRef(
      parseStyleProp(styleAttr, "font-family") ?? "var(--font-ibm-plex-mono)",
    )
    const fontWeightRaw = parseStyleProp(styleAttr, "font-weight") ?? "400"
    const fontWeight = parseInt(fontWeightRaw, 10) || 400
    const fontStyle = parseStyleProp(styleAttr, "font-style") ?? "normal"
    const lsRaw = parseStyleProp(styleAttr, "letter-spacing") ?? "0"
    const letterSpacing = parseFloat(lsRaw) || 0

    const rawFill = textEl.getAttribute("fill") ?? "currentColor"
    const fill = resolveFillColor(rawFill)

    // 提取文字行：优先从 <tspan> 子元素提取，再从 textContent 分行
    const tspans = Array.from(textEl.querySelectorAll("tspan"))
    let lines: string[]
    let lineHeightRatio = 1.2

    if (tspans.length > 0) {
      lines = tspans.map((ts) => ts.textContent ?? "")
      const secondTspan = tspans[1]
      if (secondTspan && fontSize > 0) {
        const dy = parseFloat(secondTspan.getAttribute("dy") ?? "0")
        if (dy > 0) lineHeightRatio = dy / fontSize
      }
    } else {
      lines = (textEl.textContent ?? "").split("\n").filter((l) => l !== "")
      if (lines.length === 0) lines = [textEl.textContent ?? ""]
    }

    descriptors.push({
      id: `t${i}`,
      x, y, fontSize, fontFamily, fontWeight, fontStyle, lines, lineHeightRatio, letterSpacing, fill,
    })
    elements.push(textEl)
    resolvedFills.push(fill)
  }

  return { descriptors, elements, resolvedFills }
}

/**
 * 将 SVG 字符串中的所有 <text> 元素转曲为 <path>。
 *
 * 流程：
 *  1. DOMParser 解析 SVG 字符串
 *  2. 提取 <text> 元素 → 构建 TextDescriptor[]
 *  3. POST Nest /api/texts-to-paths → 获取 path data（用户字体由后端 resolve）
 *  4. pathD 有值：替换为 <path>
 *  5. pathD=null：将 font-family 从 CSS var 更新为 fallback 族名，保留 <text>
 *  6. 移除 <style> 字体嵌入块（字体已转曲，不再需要）
 *  7. XMLSerializer 序列化返回
 *
 * 失败时（网络错误等）返回原始 SVG 字符串。
 */
async function replaceSvgTextsWithPaths(svgStr: string): Promise<string> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgStr, "image/svg+xml")

  const { descriptors, elements, resolvedFills } = extractTextDescriptors(doc)
  if (descriptors.length === 0) return svgStr

  let results: Array<{ id: string; pathD: string | null }>
  try {
    ;({ results } = await textsToPaths(descriptors))
  } catch (err) {
    console.error("[exportArtboard] 调用 /api/texts-to-paths 失败:", err)
    return svgStr
  }

  // 替换 <text> 为 <path>；无法转曲时更新 font-family 为 fallback
  for (let i = 0; i < elements.length; i++) {
    const r = results[i]
    const textEl = elements[i]
    if (!r || !textEl) continue

    if (r.pathD === null) {
      // 无法转曲：将 font-family CSS var 替换为 fallback 族名，保留 <text>
      const styleAttr = textEl.getAttribute("style") ?? ""
      const fontFamilyVal = parseStyleProp(styleAttr, "font-family") ?? ""
      if (fontFamilyVal.startsWith("var(")) {
        const varName = fontFamilyVal.slice(4).replace(/\)$/, "").trim()
        const asset = FONT_ASSETS[varName]
        if (asset) {
          const newStyle = styleAttr.replace(
            /font-family\s*:[^;]+/,
            `font-family: ${asset.fallback}`,
          )
          textEl.setAttribute("style", newStyle)
        }
      }
      continue
    }

    // 转曲成功：替换为 <path>
    const pathEl = doc.createElementNS(SVG_NS, "path")
    pathEl.setAttribute("d", r.pathD)
    const fill = resolvedFills[i] ?? "currentColor"
    pathEl.setAttribute("fill", fill)
    const dataKey = textEl.getAttribute("data-key")
    if (dataKey) pathEl.setAttribute("data-key", dataKey)
    textEl.parentNode?.replaceChild(pathEl, textEl)
  }

  // 移除 <style> 字体 CSS（字体已转曲为路径，不再需要 @font-face）
  doc.querySelectorAll("style").forEach((s) => s.remove())

  return new XMLSerializer().serializeToString(doc.documentElement)
}

function buildExportFilename(
  ext: string,
  templateId?: string,
) {
  const now = new Date()

  const pad = (n: number) =>
    String(n).padStart(2, "0")

  const ts =
    `${now.getFullYear()}-` +
    `${pad(now.getMonth() + 1)}-` +
    `${pad(now.getDate())}-` +
    `${pad(now.getHours())}` +
    `${pad(now.getMinutes())}` +
    `${pad(now.getSeconds())}`

  return `keyboard-${templateId ?? "custom"}-${ts}.${ext}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function createSvgImageEl(ns: string, el: CanvasImageElement, src: string): SVGImageElement {
  const img = document.createElementNS(ns, "image") as SVGImageElement
  img.setAttribute("href", src)
  img.setAttribute("x", String(el.x))
  img.setAttribute("y", String(el.y))
  img.setAttribute("width", String(el.width))
  img.setAttribute("height", String(el.height))
  if (el.opacity !== 1) img.setAttribute("opacity", String(el.opacity))
  if (el.rotation) {
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    img.setAttribute("transform", `rotate(${el.rotation},${cx},${cy})`)
  }
  return img
}

/**
 * 将当前画板状态合成为一个完整的 SVG 字符串：
 * 1. 背景色矩形
 * 2. 克隆已渲染的键盘 SVG（已含 clipToKeycaps 图片）
 * 3. HTML 层自由图片（含 clipToKeycapId 按键裁剪）
 *
 * 注：<text> 元素仍保留在输出中，由后续 replaceSvgTextsWithPaths 转曲。
 */
export function buildExportSvgString({
  artboardEl,
  artW,
  artH,
  artPad,
  unit,
  keys,
}: ExportArtboardParams): string {
  if (!artboardEl) return ""
  const svgEl = artboardEl.querySelector("svg") as SVGSVGElement | null
  if (!svgEl) return ""

  const exportSvg = document.createElementNS(SVG_NS, "svg")
  exportSvg.setAttribute("xmlns", SVG_NS)
  exportSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink")
  exportSvg.setAttribute("width", String(artW))
  exportSvg.setAttribute("height", String(artH))
  exportSvg.setAttribute("viewBox", `0 0 ${artW} ${artH}`)

  const { artboardBackground, canvasElements: elements, assetMap } =
    useDesignUIStore.getState()

  const bg = document.createElementNS(SVG_NS, "rect")
  bg.setAttribute("width", String(artW))
  bg.setAttribute("height", String(artH))
  bg.setAttribute("fill", artboardBackground)
  exportSvg.appendChild(bg)

  const kbGroup = document.createElementNS(SVG_NS, "g")
  kbGroup.setAttribute("transform", `translate(${artPad},${artPad})`)
  const svgClone = svgEl.cloneNode(true) as SVGSVGElement
  while (svgClone.firstChild) kbGroup.appendChild(svgClone.firstChild)
  exportSvg.appendChild(kbGroup)

  const freeImages = elements.filter(
    (el): el is CanvasImageElement =>
      el.type === "image" && !el.clipToKeycaps,
  )

  for (const el of freeImages) {
    if (el.clipToKeycapId) {
      const key = keys.find((k) => k.keyId === el.clipToKeycapId)
      if (!key) continue
      const clipId = `export-clip-${el.id}`
      const kx = artPad + key.x * unit + KEYCAP_GAP / 2
      const ky = artPad + key.y * unit + KEYCAP_GAP / 2
      const kw = key.w * unit - KEYCAP_GAP
      const kh = key.h * unit - KEYCAP_GAP

      const defs = document.createElementNS(SVG_NS, "defs")
      const clipPath = document.createElementNS(SVG_NS, "clipPath")
      clipPath.setAttribute("id", clipId)
      const clipRect = document.createElementNS(SVG_NS, "rect")
      clipRect.setAttribute("x", String(kx))
      clipRect.setAttribute("y", String(ky))
      clipRect.setAttribute("width", String(kw))
      clipRect.setAttribute("height", String(kh))
      clipRect.setAttribute("rx", String(KEY_RADIUS_BASE))
      clipPath.appendChild(clipRect)
      defs.appendChild(clipPath)
      exportSvg.appendChild(defs)

      const imgEl = createSvgImageEl(SVG_NS, el, assetMap[el.assetId] ?? "")
      imgEl.setAttribute("clip-path", `url(#${clipId})`)
      exportSvg.appendChild(imgEl)
    } else {
      exportSvg.appendChild(createSvgImageEl(SVG_NS, el, assetMap[el.assetId] ?? ""))
    }
  }

  return new XMLSerializer().serializeToString(exportSvg)
}

/** 将画板 SVG 渲染到 Canvas（含转曲），供 PNG 导出与缩略图生成复用 */
export async function renderArtboardToCanvas(
  params: ExportArtboardParams,
  scale: number,
): Promise<HTMLCanvasElement | null> {
  const rawSvgStr = buildExportSvgString(params)
  if (!rawSvgStr) return null

  const svgStr = await replaceSvgTextsWithPaths(rawSvgStr)
  const { artW, artH } = params
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = artW * scale
      canvas.height = artH * scale
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** 生成 480px 宽 WebP 缩略图 Blob，供保存设计时上传 COS 使用 */
export async function generateThumbnailBlob(
  params: ExportArtboardParams,
  targetWidth = 480,
): Promise<Blob | null> {
  const scale = Math.min(1, targetWidth / params.artW)
  const canvas = await renderArtboardToCanvas(params, scale)
  if (!canvas) return null

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", 0.82)
  })
}

export async function exportArtboardSvg(params: ExportArtboardParams) {
  const rawSvgStr = buildExportSvgString(params)
  if (!rawSvgStr) return
  const svgStr = await replaceSvgTextsWithPaths(rawSvgStr)
  const { templateId } = useDesignUIStore.getState()
  triggerDownload(
    new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }),
    buildExportFilename("svg", templateId),
  )
}

export async function exportArtboardPng(
  params: ExportArtboardParams,
  scale = 2,
) {
  const canvas = await renderArtboardToCanvas(params, scale)
  if (!canvas) return

  const { templateId } = useDesignUIStore.getState()
  const filename = buildExportFilename("png", templateId)

  canvas.toBlob((pngBlob) => {
    if (!pngBlob) return
    triggerDownload(pngBlob, filename)
  }, "image/png")
}

// ─── 导入 JSON ─────────────────────────────────────────

/**
 * 导出 JSON 中单个画布元素的格式。
 * 为保持 JSON 文件自包含，导出时将 assetId 对应的 src 内联到元素中；
 * 旧版本的文件可能直接含有 src 字段（无 assetId），导入时做向后兼容处理。
 */
export type ExportCanvasElement = Omit<CanvasElement, "assetId"> & {
  src: string
  assetId?: string
}

export interface ImportPayload {
  version: number
  templateId: TemplateId
  artboardBackground: string
  fontFamily: string
  globalKeycapStyle: GlobalKeycapStyle
  layers: Layer[]
  layerKeycapOverrides: LayerKeycapOverrides
  canvasElements: ExportCanvasElement[]
}

/** 读取并校验上传的 JSON 文件，返回解析结果或错误原因 */
export async function parseImportJson(
  file: File,
): Promise<{ ok: true; data: ImportPayload } | { ok: false; error: string }> {
  let raw: unknown
  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "文件解析失败，请确认选择的是有效的 JSON 文件。" }
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      error: "该文件不是本网站导出的设计文件，请使用【导出 JSON】功能导出后再导入。",
    }
  }

  const obj = raw as Record<string, unknown>

  if (obj["version"] !== 1) {
    return {
      ok: false,
      error: "该文件不是本网站导出的设计文件，或版本不兼容。\n请使用本网站【导出 JSON】功能导出的文件再导入。",
    }
  }

  const validTemplateIds = TEMPLATES.map((t) => t.id) as string[]
  if (typeof obj["templateId"] !== "string" || !validTemplateIds.includes(obj["templateId"])) {
    return {
      ok: false,
      error: "该文件不是本网站导出的设计文件，请使用【导出 JSON】功能导出后再导入。",
    }
  }

  if (
    typeof obj["artboardBackground"] !== "string" ||
    typeof obj["globalKeycapStyle"] !== "object" ||
    obj["globalKeycapStyle"] === null ||
    !Array.isArray(obj["layers"]) ||
    typeof obj["layerKeycapOverrides"] !== "object" ||
    obj["layerKeycapOverrides"] === null ||
    !Array.isArray(obj["canvasElements"])
  ) {
    return {
      ok: false,
      error: "该文件格式不正确，请使用本网站【导出 JSON】功能导出的文件再导入。",
    }
  }

  return { ok: true, data: normalizeDesignColorFields(raw as ImportPayload) }
}

/** 将解析后的设计数据应用到 store，覆盖当前全部设计状态 */
export function applyImportData(data: ImportPayload) {
  const normalized = normalizeDesignColorFields(data)
  // 将导出格式（内联 src）转换为运行时格式（assetId + assetMap）
  const assetMap: Record<string, string> = {}
  const canvasElements: CanvasElement[] = normalized.canvasElements.map((el) => {
    const src = el.src ?? ""
    // 若 JSON 已含 assetId（未来格式），直接复用；否则为每个元素生成新 assetId
    const assetId = el.assetId ?? `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    if (src) assetMap[assetId] = src
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { src: _src, ...rest } = el
    return { ...rest, assetId } as CanvasElement
  })

  useDesignUIStore.setState({
    templateId: normalized.templateId,
    artboardBackground: normalized.artboardBackground,
    fontFamily: normalized.fontFamily ?? "var(--font-ibm-plex-mono)",
    globalKeycapStyle: normalized.globalKeycapStyle,
    layers: normalized.layers,
    layerKeycapOverrides: normalized.layerKeycapOverrides,
    canvasElements,
    assetMap,
    selectedKeycapIds: [],
    selectedElementId: null,
    activeLayerId: null,
    keycapEditTarget: null,
    liveDragOverrides: {},
  })
}

export function exportArtboardJson() {
  const {
    templateId,
    artboardBackground,
    fontFamily,
    globalKeycapStyle,
    layers,
    layerKeycapOverrides,
    canvasElements: elements,
    assetMap,
  } = useDesignUIStore.getState()

  // 将运行时格式（assetId 引用）转为 JSON 自包含格式（内联 src），方便离线存储与跨设备使用
  const exportElements: ExportCanvasElement[] = elements.map((el) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { assetId, ...rest } = el
    return { ...rest, src: assetMap[assetId] ?? "" }
  })

  const payload = normalizeDesignColorFields({
    version: 1,
    templateId,
    artboardBackground,
    fontFamily,
    globalKeycapStyle,
    layers,
    layerKeycapOverrides,
    canvasElements: exportElements,
  })
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    buildExportFilename("json", templateId),
  )
}
