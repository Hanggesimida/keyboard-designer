/**
 * 服务端字体转曲工具（Node.js only）
 *
 * 流程：FontSource → Buffer → opentype.parse → Font → SVG path
 */

import fs from "fs"
import path from "path"
import * as opentype from "opentype.js"
import { resolveFontFile } from "@/lib/fontAssets"
import {
  isUserFontRef,
  normalizeFontFamilyRef,
} from "@/lib/fonts/fontRef"

// ─── 字体缓存（进程级别，避免重复 IO/解析）────────────────────────────────
const fontCache = new Map<string, opentype.Font>()

type FontSource =
  | { kind: "bundled"; cacheKey: string; relativePath: string }
  | { kind: "remote"; cacheKey: string; url: string }

export type UserFontAssetMap = Record<string /* uf:id */, { url: string }>

function parseFontBuffer(buf: Buffer, label: string): opentype.Font | null {
  try {
    const arrayBuf = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer
    return opentype.parse(arrayBuf)
  } catch (err) {
    console.error(`[fontToPath] 字体解析失败: ${label}`, err)
    return null
  }
}

async function loadFont(source: FontSource): Promise<opentype.Font | null> {
  if (fontCache.has(source.cacheKey)) {
    return fontCache.get(source.cacheKey)!
  }

  if (source.kind === "bundled") {
    const absPath = path.join(process.cwd(), "public", source.relativePath)
    if (!fs.existsSync(absPath)) {
      console.warn(`[fontToPath] 字体文件不存在: ${absPath}`)
      return null
    }
    const buf = fs.readFileSync(absPath)
    const font = parseFontBuffer(buf, absPath)
    if (font) fontCache.set(source.cacheKey, font)
    return font
  }

  try {
    const res = await fetch(source.url)
    if (!res.ok) {
      console.warn(`[fontToPath] 远程字体下载失败 ${res.status}: ${source.url}`)
      return null
    }
    const ab = await res.arrayBuffer()
    const buf = Buffer.from(ab)
    const font = parseFontBuffer(buf, source.url)
    if (font) fontCache.set(source.cacheKey, font)
    return font
  } catch (err) {
    console.error(`[fontToPath] 远程字体加载异常: ${source.url}`, err)
    return null
  }
}

function resolveFontSource(
  fontFamily: string,
  fontWeight: number | undefined,
  fontStyle: string | undefined,
  userAssets?: UserFontAssetMap,
): FontSource | null {
  const ref = normalizeFontFamilyRef(fontFamily)

  if (isUserFontRef(ref)) {
    const asset = userAssets?.[ref]
    if (!asset?.url) return null
    return { kind: "remote", cacheKey: `remote:${ref}`, url: asset.url }
  }

  const relativePath = resolveFontFile(ref, fontWeight, fontStyle)
  if (!relativePath) return null
  return {
    kind: "bundled",
    cacheKey: `bundled:${relativePath}`,
    relativePath,
  }
}

/** 供治具层判断：内置有文件，或用户字体有 url */
export function canOutlineFont(
  fontFamily: string,
  userAssets?: UserFontAssetMap,
  fontWeight?: number,
  fontStyle?: string,
): boolean {
  return resolveFontSource(fontFamily, fontWeight, fontStyle, userAssets) != null
}

// ─── TextDescriptor ────────────────────────────────────────────────────────

/** 单个文字元素的描述符，用于批量转曲 */
export interface TextDescriptor {
  /** 调用方自定义 ID，用于在结果中对齐 */
  id: string
  /**
   * 文字中心点 x（text-anchor: middle 时文字居中基准）
   * 对应 SVG <text x="...">，已是居中坐标
   */
  x: number
  /**
   * 文字中心点 y（dominant-baseline: central）
   * 多行时 y 为整块文字的垂直中心
   */
  y: number
  fontSize: number
  /** CSS var / 裸族名 / uf:{id} */
  fontFamily: string
  /** 字重：400 = 常规，700 = 加粗；默认 400 */
  fontWeight?: number
  /** 字形：'normal' / 'italic'；默认 'normal' */
  fontStyle?: string
  /** 按换行符分割的文字行列表 */
  lines: string[]
  /** 行高比（lineHeight = fontSize * lineHeightRatio） */
  lineHeightRatio: number
  /** 字间距（SVG 用户单位，已乘以比例因子） */
  letterSpacing: number
  /** SVG fill 颜色（已解析，不含 CSS var） */
  fill: string
}

export interface PathResult {
  id: string
  /** SVG path d 字符串；null 表示无法转曲（无字体文件 / 加载失败），调用方应保留原 <text> */
  pathD: string | null
}

// ─── 核心：单行文字 → 居中路径 ────────────────────────────────────────────

/**
 * 将一行文字渲染为以 centerX 居中的 SVG Path。
 *
 * dominant-baseline: central 坐标换算：
 *   opentype 的 y 是字体 baseline（上行线为正方向）。
 *   SVG dominant-baseline:central 把 em 格中心对齐到 y。
 *   em 格中心 ≈ ascender / 2（按 hhea metrics）。
 *   opentypeBaselineY = svgCenterY + (ascender * fontSize / unitsPerEm) / 2
 */
function renderCenteredLine(
  font: opentype.Font,
  text: string,
  centerX: number,
  centerY: number,
  fontSize: number,
  letterSpacing: number,
): opentype.Path {
  const scale = fontSize / font.unitsPerEm
  const baselineY = centerY + (font.ascender * scale) / 2

  // 计算行宽（用于水平居中）
  let lineWidth = 0
  const chars = Array.from(text)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (!ch) continue
    const glyph = font.charToGlyph(ch)
    if (!glyph) continue
    lineWidth += (glyph.advanceWidth ?? 0) * scale
    if (i < chars.length - 1) lineWidth += letterSpacing
  }

  const startX = centerX - lineWidth / 2
  const combined = new opentype.Path()

  if (letterSpacing === 0) {
    const p = font.getPath(text, startX, baselineY, fontSize, { kerning: true })
    combined.commands = p.commands
  } else {
    let curX = startX
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      if (!ch) continue
      const glyph = font.charToGlyph(ch)
      if (!glyph) continue
      const p = glyph.getPath(curX, baselineY, fontSize)
      combined.commands.push(...p.commands)
      const advance = (glyph.advanceWidth ?? 0) * scale
      curX += advance + (i < chars.length - 1 ? letterSpacing : 0)
    }
  }

  return combined
}

// ─── 批量转曲入口 ─────────────────────────────────────────────────────────

/**
 * 将 TextDescriptor 数组批量转换为 SVG path d 字符串。
 */
export async function textDescriptorsToPathResults(
  descriptors: TextDescriptor[],
  userAssets?: UserFontAssetMap,
): Promise<PathResult[]> {
  const sourceByDesc = new Map<string, FontSource | null>()
  const uniqueSources = new Map<string, FontSource>()

  for (const desc of descriptors) {
    const source = resolveFontSource(
      desc.fontFamily,
      desc.fontWeight,
      desc.fontStyle,
      userAssets,
    )
    sourceByDesc.set(desc.id, source)
    if (source && !uniqueSources.has(source.cacheKey)) {
      uniqueSources.set(source.cacheKey, source)
    }
  }

  const fontMap = new Map<string, opentype.Font | null>()
  await Promise.all(
    [...uniqueSources.values()].map(async (source) => {
      fontMap.set(source.cacheKey, await loadFont(source))
    }),
  )

  const results: PathResult[] = []

  for (const desc of descriptors) {
    const source = sourceByDesc.get(desc.id) ?? null
    if (!source) {
      results.push({ id: desc.id, pathD: null })
      continue
    }

    const font = fontMap.get(source.cacheKey) ?? null
    if (!font) {
      results.push({ id: desc.id, pathD: null })
      continue
    }

    const { x, y, fontSize, letterSpacing, lineHeightRatio, lines } = desc
    const lineHeight = fontSize * lineHeightRatio
    const n = lines.length

    // 多行垂直居中：第一行 centerY 上移 (n-1)*lh/2
    const firstLineCenterY = y - ((n - 1) * lineHeight) / 2

    const combined = new opentype.Path()
    for (let i = 0; i < n; i++) {
      const line = lines[i] || "\u00A0"
      const lineCenterY = firstLineCenterY + i * lineHeight
      const linePath = renderCenteredLine(font, line, x, lineCenterY, fontSize, letterSpacing)
      combined.commands.push(...linePath.commands)
    }

    results.push({ id: desc.id, pathD: combined.toPathData(4) })
  }

  return results
}

// ─── 便捷接口（jig 生成内部使用）─────────────────────────────────────────

export { resolveFontFile }
