import { useDesignUIStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import { KEY_RADIUS_BASE, KEYCAP_GAP, type KeyDef } from "@/modules/design/components/canvas/KeycapNode"
import { FONT_OPTIONS } from "@/modules/design/components/sidebar/sections/right/font-options"

const SVG_NS = "http://www.w3.org/2000/svg"

export interface ExportArtboardParams {
  artboardEl: HTMLElement | null
  artW: number
  artH: number
  artPad: number
  unit: number
  keys: KeyDef[]
}

/**
 * 收集当前页面中所有 @font-face 规则以及 next/font 注入的 CSS 变量，
 * 拼合为一段 CSS 字符串内嵌到导出 SVG 中，确保独立 SVG / PNG 也能加载字体。
 */
function collectFontCSS(): string {
  const fontFaceRules: string[] = []

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaceRules.push(rule.cssText)
        }
      }
    } catch {
      // 跨域样式表无法访问，跳过
    }
  }

  const computed = getComputedStyle(document.documentElement)
  const fontVars = FONT_OPTIONS
    .filter((f) => f.value.startsWith("var(--"))
    .map((f) => {
      const varName = f.value.slice(4, -1) // "var(--font-inter)" -> "--font-inter"
      const val = computed.getPropertyValue(varName).trim()
      return val ? `${varName}: ${val}` : ""
    })
    .filter(Boolean)

  const rootVars = fontVars.length ? `:root { ${fontVars.join("; ")} }` : ""
  return [rootVars, ...fontFaceRules].join("\n")
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

function createSvgImageEl(ns: string, el: CanvasImageElement): SVGImageElement {
  const img = document.createElementNS(ns, "image") as SVGImageElement
  img.setAttribute("href", el.src)
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

  // 注入字体 CSS，确保导出的 SVG / PNG 中字体可以正常渲染
  const fontCSS = collectFontCSS()
  if (fontCSS) {
    const styleEl = document.createElementNS(SVG_NS, "style")
    styleEl.textContent = fontCSS
    exportSvg.appendChild(styleEl)
  }

  const { artboardBackground, canvasElements: elements } =
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

      const imgEl = createSvgImageEl(SVG_NS, el)
      imgEl.setAttribute("clip-path", `url(#${clipId})`)
      exportSvg.appendChild(imgEl)
    } else {
      exportSvg.appendChild(createSvgImageEl(SVG_NS, el))
    }
  }

  return new XMLSerializer().serializeToString(exportSvg)
}

export function exportArtboardSvg(params: ExportArtboardParams) {
  const svgStr = buildExportSvgString(params)
  if (!svgStr) return
  const { templateId } = useDesignUIStore.getState()
  triggerDownload(
    new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }),
    buildExportFilename("svg", templateId),
  )
}

export function exportArtboardPng(
  params: ExportArtboardParams,
  scale = 2,
) {
  const svgStr = buildExportSvgString(params)
  if (!svgStr) return
  const { templateId } = useDesignUIStore.getState()
  const filename = buildExportFilename("png", templateId)
  const { artW, artH } = params
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = artW * scale
    canvas.height = artH * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      triggerDownload(pngBlob, filename)
    }, "image/png")
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
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
  } = useDesignUIStore.getState()
  const payload = {
    version: 1,
    templateId,
    artboardBackground,
    fontFamily,
    globalKeycapStyle,
    layers,
    layerKeycapOverrides,
    canvasElements: elements,
  }
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    buildExportFilename("json", templateId),
  )
}
