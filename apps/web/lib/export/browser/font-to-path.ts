import { resolveFontFile } from "@/lib/fontAssets"
import {
  isUserFontRef,
  normalizeFontFamilyRef,
  parseUserFontId,
} from "@/lib/fonts/fontRef"
import { getLoadedUserFontUrl } from "@/lib/fonts/loadUserFonts"
import type { PathResult, TextDescriptor } from "../contracts"

type OpenType = typeof import("opentype.js")
type Font = import("opentype.js").Font
type Path = import("opentype.js").Path

const fontCache = new Map<string, Promise<Font | null>>()

function resolveFontUrl(
  family: string,
  weight = 400,
  style = "normal",
): string | null {
  const ref = normalizeFontFamilyRef(family)
  if (isUserFontRef(ref)) {
    const id = parseUserFontId(ref)
    return id ? getLoadedUserFontUrl(id) : null
  }
  const file = resolveFontFile(ref, weight, style)
  return file ? `/${file.replace(/^\/+/, "")}` : null
}

async function loadFont(url: string): Promise<Font | null> {
  const cached = fontCache.get(url)
  if (cached) return cached

  const pending = (async () => {
    try {
      const [opentype, response] = await Promise.all([
        import("opentype.js"),
        fetch(url),
      ])
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return opentype.parse(await response.arrayBuffer())
    } catch (error) {
      console.warn("[browserExport] 字体加载失败", { url, error })
      return null
    }
  })()
  fontCache.set(url, pending)
  return pending
}

function renderCenteredLine(
  opentype: OpenType,
  font: Font,
  text: string,
  centerX: number,
  centerY: number,
  fontSize: number,
  letterSpacing: number,
): Path {
  const scale = fontSize / font.unitsPerEm
  const baselineY = centerY + (font.ascender * scale) / 2
  const chars = Array.from(text)
  let lineWidth = 0

  chars.forEach((char, index) => {
    const glyph = font.charToGlyph(char)
    lineWidth += (glyph.advanceWidth ?? 0) * scale
    if (index < chars.length - 1) lineWidth += letterSpacing
  })

  const path = new opentype.Path()
  let x = centerX - lineWidth / 2
  chars.forEach((char, index) => {
    const glyph = font.charToGlyph(char)
    path.commands.push(...glyph.getPath(x, baselineY, fontSize).commands)
    x +=
      (glyph.advanceWidth ?? 0) * scale +
      (index < chars.length - 1 ? letterSpacing : 0)
  })
  return path
}

export function canOutlineFont(
  family: string,
  weight?: number,
  style?: string,
): boolean {
  return resolveFontUrl(family, weight, style) !== null
}

export async function textDescriptorsToPathResults(
  descriptors: TextDescriptor[],
): Promise<PathResult[]> {
  const opentype = await import("opentype.js")
  const urls = descriptors.map((descriptor) =>
    resolveFontUrl(
      descriptor.fontFamily,
      descriptor.fontWeight,
      descriptor.fontStyle,
    ),
  )
  const uniqueUrls = [...new Set(urls.filter((url): url is string => !!url))]
  const loaded = new Map(
    await Promise.all(
      uniqueUrls.map(async (url) => [url, await loadFont(url)] as const),
    ),
  )

  return descriptors.map((descriptor, index) => {
    const url = urls[index]
    const font = url ? loaded.get(url) : null
    if (!font) return { id: descriptor.id, pathD: null }

    try {
      const path = new opentype.Path()
      const lineHeight = descriptor.fontSize * descriptor.lineHeightRatio
      const firstY =
        descriptor.y - ((descriptor.lines.length - 1) * lineHeight) / 2
      descriptor.lines.forEach((line, lineIndex) => {
        const linePath = renderCenteredLine(
          opentype,
          font,
          line || "\u00a0",
          descriptor.x,
          firstY + lineIndex * lineHeight,
          descriptor.fontSize,
          descriptor.letterSpacing,
        )
        path.commands.push(...linePath.commands)
      })
      return { id: descriptor.id, pathD: path.toPathData(4) }
    } catch (error) {
      console.warn("[browserExport] 文字转曲失败", {
        id: descriptor.id,
        error,
      })
      return { id: descriptor.id, pathD: null }
    }
  })
}
