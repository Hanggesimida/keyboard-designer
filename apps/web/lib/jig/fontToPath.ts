/**
 * 服务端字体转曲工具（Node.js only）
 *
 * 流程：ttf 文件 → opentype.parse → Font
 *
 * CJK 字体使用完整 TTF，支持转曲。
 */

import fs from "fs"
import path from "path"
import * as opentype from "opentype.js"
import { resolveFontFile } from "@/lib/fontAssets"

// ─── 字体缓存（进程级别，避免重复 IO/解析）────────────────────────────────
const fontCache = new Map<string, opentype.Font>()

/**
 * 从 public/ 目录加载并解析字体文件（ttf/otf/woff，opentype.js 直接支持）。
 * 失败时返回 null（不抛异常）。
 */
function loadFont(publicRelPath: string): opentype.Font | null {
  if (fontCache.has(publicRelPath)) {
    return fontCache.get(publicRelPath)!
  }

  const absPath = path.join(process.cwd(), "public", publicRelPath)
  if (!fs.existsSync(absPath)) {
    console.warn(`[fontToPath] 字体文件不存在: ${absPath}`)
    return null
  }

  try {
    const buf = fs.readFileSync(absPath)
    const arrayBuf = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer
    const font = opentype.parse(arrayBuf)
    fontCache.set(publicRelPath, font)
    return font
  } catch (err) {
    console.error(`[fontToPath] 字体解析失败: ${absPath}`, err)
    return null
  }
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
  /** CSS var 形式（"var(--font-xxx)"）或裸族名（"IBM Plex Mono"） */
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
  /** SVG path d 字符串；null 表示 CJK/不支持，调用方应保留原 <text> */
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
): Promise<PathResult[]> {
  // 预加载本次用到的所有字体（去重）
  const fontFileMap = new Map<string, opentype.Font | null>()
  for (const desc of descriptors) {
    const fontFile = resolveFontFile(desc.fontFamily, desc.fontWeight, desc.fontStyle)
    if (fontFile && !fontFileMap.has(fontFile)) {
      fontFileMap.set(fontFile, loadFont(fontFile))
    }
  }

  const results: PathResult[] = []

  for (const desc of descriptors) {
    const fontFile = resolveFontFile(desc.fontFamily, desc.fontWeight, desc.fontStyle)

    if (!fontFile) {
      // CJK 或未知字体 → 保留 <text>
      results.push({ id: desc.id, pathD: null })
      continue
    }

    const font = fontFileMap.get(fontFile) ?? null
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
