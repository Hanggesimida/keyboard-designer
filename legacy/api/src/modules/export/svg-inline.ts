/**
 * SVG 内联、注入与 Illustrator 兼容工具。
 */

/** 判断 src 是否为 SVG data URL */
export function isSvgDataUrl(src: string): boolean {
  return src.startsWith("data:image/svg+xml")
}

/** 解码 SVG data URL（支持 base64 和 percent-encoded） */
export function decodeSvgSrc(src: string): string | null {
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

/**
 * 清理 Adobe Illustrator 导出 SVG 中的专有标记。
 */
export function sanitizeIllustratorSvg(svgText: string): string {
  let r = svgText.replace(/<!DOCTYPE[\s\S]*?>/g, "")
  r = r.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/g, "")
  r = r.replace(/<\/?switch\b[^>]*>/g, "")
  r = r.replace(/<i:aipgfRef\b[^>]*>[\s\S]*?<\/i:aipgfRef>/g, "")
  r = r.replace(/<i:aipgf\b[^>]*>[\s\S]*?<\/i:aipgf>/g, "")
  r = r.replace(/\s+i:[\w-]+="[^"]*"/g, "")
  r = r.replace(/&ns_[\w-]+;/g, "")
  r = r.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/g, "")
  return r
}

/** 解析 SVG 的 viewBox（x, y, w, h） */
export function getSvgViewBox(svgText: string): { x: number; y: number; w: number; h: number } {
  const vb = svgText.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/,
  )
  if (vb?.[1] && vb?.[2] && vb?.[3] && vb?.[4]) {
    return { x: +vb[1], y: +vb[2], w: +vb[3], h: +vb[4] }
  }
  const wm = svgText.match(/<svg[^>]*\bwidth\s*=\s*["']([\d.]+)/)
  const hm = svgText.match(/<svg[^>]*\bheight\s*=\s*["']([\d.]+)/)
  if (wm?.[1] && hm?.[1]) return { x: 0, y: 0, w: +wm[1], h: +hm[1] }
  return { x: 0, y: 0, w: 100, h: 100 }
}

/** 找到开头 <svg ...> 的结束位置（正确处理引号内的 > 字符） */
export function findSvgOpenTagEnd(svgText: string): number {
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

/** 对 SVG 内容中所有 id 和对应引用加上唯一前缀，防止多个内联 SVG id 冲突。 */
export function namespaceSvgIds(content: string, prefix: string): string {
  let r = content.replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
  r = r.replace(/url\(#([^)]+)\)/g, (_, ref) => `url(#${prefix}-${ref})`)
  r = r.replace(/xlink:href="#([^"]+)"/g, (_, ref) => `xlink:href="#${prefix}-${ref}"`)
  r = r.replace(/(?<![:\w])href="#([^"]+)"/g, (_, ref) => `href="#${prefix}-${ref}"`)
  return r
}

const SVG_INLINE_PRESENTATION_PROPS = new Set([
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-miterlimit", "clip-path", "opacity", "fill-opacity", "stroke-opacity",
])

function parseSvgClassStyles(css: string): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>()
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
  noComments.replace(/\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g, (_, className: string, decls: string) => {
    const props: Record<string, string> = { ...map.get(className) }
    for (const decl of decls.split(";")) {
      const colon = decl.indexOf(":")
      if (colon === -1) continue
      const key = decl.slice(0, colon).trim()
      const value = decl.slice(colon + 1).trim()
      if (!key || !value) continue
      if (SVG_INLINE_PRESENTATION_PROPS.has(key)) props[key] = value
    }
    if (Object.keys(props).length > 0) map.set(className, props)
    return ""
  })
  return map
}

const SVG_GEOMETRY_TAGS = new Set([
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
])

function insertPresentationAttrs(tag: string, attrs: Record<string, string>): string {
  let result = tag
  for (const [prop, value] of Object.entries(attrs)) {
    const escaped = prop.replace(/-/g, "\\-")
    if (new RegExp(`\\b${escaped}=`).test(result)) continue
    result = result.replace(/\s*\/?>$/, ` ${prop}="${value}"$&`)
  }
  return result
}

function tagHasPresentationAttr(tag: string, prop: string): boolean {
  return new RegExp(`\\b${prop.replace(/-/g, "\\-")}=`).test(tag)
}

/**
 * 将 SVG 内 <style> 中的 class 规则烘焙为元素行内 presentation 属性。
 */
export function inlineSvgClassStyles(svgInner: string): string {
  const classStyles = new Map<string, Record<string, string>>()
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/g
  let sm: RegExpExecArray | null
  while ((sm = styleRe.exec(svgInner)) !== null) {
    if (sm[1] != null) {
      for (const [cls, props] of parseSvgClassStyles(sm[1])) {
        classStyles.set(cls, { ...classStyles.get(cls), ...props })
      }
    }
  }

  let result = svgInner.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")

  if (classStyles.size > 0) {
    result = result.replace(
      /<([a-zA-Z][\w:-]*)([^>]*\bclass="([^"]+)"[^>]*)(\/?)>/g,
      (full, tagName: string, rest: string, classAttr: string, selfClose: string) => {
        const merged: Record<string, string> = {}
        for (const cls of classAttr.split(/\s+/).filter(Boolean)) {
          const props = classStyles.get(cls)
          if (props) Object.assign(merged, props)
        }
        if (Object.keys(merged).length === 0) return full
        const open = `<${tagName}${rest}${selfClose ? "/" : ""}>`
        return insertPresentationAttrs(open, merged)
      },
    )
  }

  result = result.replace(
    /<([a-zA-Z][\w:-]*)([^>]*)(\/?)>/g,
    (full, tagName: string, rest: string, selfClose: string) => {
      const lower = tagName.toLowerCase()
      if (!SVG_GEOMETRY_TAGS.has(lower)) return full
      if (tagHasPresentationAttr(rest, "fill") || tagHasPresentationAttr(rest, "stroke")) return full
      const open = `<${tagName}${rest}${selfClose ? "/" : ""}>`
      return insertPresentationAttrs(open, { fill: "#000000" })
    },
  )

  return result
}

/**
 * 将 SVG 矢量内容注册为 <symbol>（去重），写入 defsLines。
 * 返回 symbol id。
 */
export function ensureSvgSymbol(
  svgText: string,
  svgCache: Map<string, string>,
  defsLines: string[],
): string {
  const sanitized = sanitizeIllustratorSvg(svgText)
  const cached = svgCache.get(sanitized)
  if (cached) return cached

  const symbolId = `jig-svg-sym-${svgCache.size}`
  svgCache.set(sanitized, symbolId)

  const vb = getSvgViewBox(sanitized)
  const openTagEnd = findSvgOpenTagEnd(sanitized)
  if (openTagEnd === -1) return symbolId

  const closeStart = sanitized.lastIndexOf("</svg>")
  const rawInner = closeStart !== -1
    ? sanitized.slice(openTagEnd + 1, closeStart)
    : sanitized.slice(openTagEnd + 1)

  const inlinedInner = inlineSvgClassStyles(rawInner)

  const defsChunks: string[] = []
  const defsRe = /<defs[^>]*>([\s\S]*?)<\/defs>/g
  let dm: RegExpExecArray | null
  while ((dm = defsRe.exec(inlinedInner)) !== null) {
    if (dm[1] != null) defsChunks.push(dm[1])
  }
  const innerDefsContent = defsChunks.join("\n")

  const bodyOnly = inlinedInner
    .replace(/<defs[^>]*>[\s\S]*?<\/defs>/g, "")
    .replace(/<\?xml[^?]*\?>/g, "")
    .trim()

  const nsBody = namespaceSvgIds(bodyOnly, symbolId)
  const nsDefsContent = innerDefsContent.trim()
    ? namespaceSvgIds(innerDefsContent, symbolId)
    : ""

  defsLines.push(
    `    <symbol id="${symbolId}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" ` +
    `preserveAspectRatio="none">`,
  )
  if (nsDefsContent) {
    defsLines.push(`      <defs>${nsDefsContent}</defs>`)
  }
  defsLines.push(nsBody)
  defsLines.push(`    </symbol>`)

  return symbolId
}

/** 找到根 <svg> 下首个 <defs> 块对应的 </defs> 结束位置（支持嵌套 defs）。 */
export function findRootDefsCloseIndex(svgText: string): number {
  const svgTagEnd = findSvgOpenTagEnd(svgText)
  if (svgTagEnd === -1) return -1
  const defsOpen = svgText.indexOf("<defs", svgTagEnd)
  if (defsOpen === -1) return -1

  let depth = 1
  let i = defsOpen + 5
  while (i < svgText.length) {
    const nextOpen = svgText.indexOf("<defs", i)
    const nextClose = svgText.indexOf("</defs>", i)
    if (nextClose === -1) return -1

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 5
    } else {
      depth--
      if (depth === 0) return nextClose
      i = nextClose + "</defs>".length
    }
  }
  return -1
}

/** 确保根 <svg> 标签含有 xmlns:xlink 声明。 */
export function ensureXlinkNamespace(svgText: string): string {
  if (svgText.includes("xmlns:xlink")) return svgText
  return svgText.replace(/<svg\b/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"')
}

/** 将 clipPath 等定义内容注入到根 <defs> 块内部。 */
export function injectIntoDefs(svgText: string, defsContent: string): string {
  if (!defsContent.trim()) return svgText

  const defsEnd = findRootDefsCloseIndex(svgText)
  if (defsEnd !== -1) {
    return svgText.slice(0, defsEnd) + defsContent + "\n  " + svgText.slice(defsEnd)
  }

  const svgTagEnd = findSvgOpenTagEnd(svgText)
  if (svgTagEnd === -1) return svgText
  return (
    svgText.slice(0, svgTagEnd + 1) +
    `\n  <defs>\n${defsContent}\n  </defs>` +
    svgText.slice(svgTagEnd + 1)
  )
}

/** 在 </defs> 之后（或首个 <path> 之前）注入图层 <g> 块。 */
export function injectLayers(svgText: string, ...layerSvgs: string[]): string {
  const nonEmpty = layerSvgs.filter(Boolean)
  if (nonEmpty.length === 0) return svgText

  const defsEnd = findRootDefsCloseIndex(svgText)
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
