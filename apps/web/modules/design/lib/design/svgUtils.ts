/**
 * SVG 矢量图形工具函数
 * 用于解析 SVG 尺寸、转换为 data URL，供画布素材上传流程使用
 */

/**
 * 从 SVG 文本中解析尺寸。
 * 优先读取 viewBox 属性的宽高，其次读取 width/height 属性。
 * 若均无法解析则返回默认 512×512。
 */
export function parseSvgDimensions(svgText: string): { w: number; h: number } {
  // 尝试从 viewBox 属性解析，格式：viewBox="minX minY width height"
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*["'][\s,]*[\d.+-]+[\s,]+[\d.+-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/)
  if (viewBoxMatch?.[1] && viewBoxMatch?.[2]) {
    const w = parseFloat(viewBoxMatch[1])
    const h = parseFloat(viewBoxMatch[2])
    if (w > 0 && h > 0) return { w, h }
  }

  // 尝试从 width/height 属性解析（去除单位 px/em/pt 等）
  const wMatch = svgText.match(/<svg[^>]*\s+width\s*=\s*["']([\d.]+)/)
  const hMatch = svgText.match(/<svg[^>]*\s+height\s*=\s*["']([\d.]+)/)
  if (wMatch?.[1] && hMatch?.[1]) {
    const w = parseFloat(wMatch[1])
    const h = parseFloat(hMatch[1])
    if (w > 0 && h > 0) return { w, h }
  }

  // 默认尺寸
  return { w: 512, h: 512 }
}

/**
 * 将 SVG 文本转换为 base64 data URL。
 * 使用 TextEncoder 处理非 ASCII 字符（如中文路径名）。
 */
export function svgTextToDataUrl(svgText: string): string {
  const bytes = new TextEncoder().encode(svgText)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  const base64 = btoa(binary)
  return `data:image/svg+xml;base64,${base64}`
}

/** 单个 SVG 文件的解析结果 */
export interface SvgFileResult {
  src: string
  w: number
  h: number
}

/**
 * 异步读取 SVG File 对象，返回 data URL 及解析出的尺寸。
 * 读取失败时返回 null。
 */
export function readSvgFile(file: File): Promise<SvgFileResult | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text !== "string") {
        resolve(null)
        return
      }
      const { w, h } = parseSvgDimensions(text)
      const src = svgTextToDataUrl(text)
      resolve({ src, w, h })
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

/** 判断文件是否为 SVG */
export function isSvgFile(file: File): boolean {
  return (
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg")
  )
}
