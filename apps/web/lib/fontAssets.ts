/**
 * 字体资产映射表 — CSS var → 字体文件路径 + 族名
 *
 * file: 相对 public/ 的 TTF 路径（页面预览资产；服务端转曲以 api ExportModule 为准）。
 * null 表示该字体未提供转曲文件，导出时保留 <text>。
 *
 * 与 apps/api/src/modules/export/font-assets.ts 保持同步。
 */

export interface FontAsset {
  /** SVG font-family 属性值（转曲成功时不再需要） */
  family: string
  /** 未转曲时的完整 fallback 栈 */
  fallback: string
  /** 相对 public/ 的 TTF 路径（400-normal）；null = 跳过转曲 */
  file: string | null
  /** 700-normal 粗体文件；undefined 表示无粗体变体 */
  fileBold?: string | null
  /** 400-italic 斜体文件；undefined 表示无斜体变体 */
  fileItalic?: string | null
  /** 700-italic 粗斜体文件；undefined 表示无粗斜体变体 */
  fileBoldItalic?: string | null
}

export const FONT_ASSETS: Record<string, FontAsset> = {
  "--font-inter": {
    family: "Inter",
    fallback: "Inter, system-ui, sans-serif",
    file:            "fonts/inter/inter-latin-400-normal.ttf",
    fileBold:        "fonts/inter/inter-latin-700-normal.ttf",
    fileItalic:      "fonts/inter/inter-latin-400-italic.ttf",
    fileBoldItalic:  "fonts/inter/inter-latin-700-italic.ttf",
  },
  "--font-ibm-plex-mono": {
    family: "IBM Plex Mono",
    fallback: "IBM Plex Mono, Courier New, monospace",
    file:            "fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.ttf",
    fileBold:        "fonts/ibm-plex-mono/ibm-plex-mono-latin-700-normal.ttf",
    fileItalic:      "fonts/ibm-plex-mono/ibm-plex-mono-latin-400-italic.ttf",
    fileBoldItalic:  "fonts/ibm-plex-mono/ibm-plex-mono-latin-700-italic.ttf",
  },
  "--font-jetbrains-mono": {
    family: "JetBrains Mono",
    fallback: "JetBrains Mono, Courier New, monospace",
    file:            "fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.ttf",
    fileBold:        "fonts/jetbrains-mono/jetbrains-mono-latin-700-normal.ttf",
    fileItalic:      "fonts/jetbrains-mono/jetbrains-mono-latin-400-italic.ttf",
    fileBoldItalic:  "fonts/jetbrains-mono/jetbrains-mono-latin-700-italic.ttf",
  },
  "--font-space-grotesk": {
    family: "Space Grotesk",
    fallback: "Space Grotesk, system-ui, sans-serif",
    file:      "fonts/space-grotesk/space-grotesk-latin-400-normal.ttf",
    fileBold:  "fonts/space-grotesk/space-grotesk-latin-700-normal.ttf",
  },
  "--font-oxanium": {
    family: "Oxanium",
    fallback: "Oxanium, system-ui, sans-serif",
    file:      "fonts/oxanium/oxanium-latin-400-normal.ttf",
    fileBold:  "fonts/oxanium/oxanium-latin-700-normal.ttf",
  },
  "--font-orbitron": {
    family: "Orbitron",
    fallback: "Orbitron, system-ui, sans-serif",
    // 目录名拼写为 obitron（与实际文件保持一致）
    file:      "fonts/obitron/orbitron-latin-400-normal.ttf",
    fileBold:  "fonts/obitron/orbitron-latin-700-normal.ttf",
  },
  "--font-dm-mono": {
    family: "DM Mono",
    fallback: "DM Mono, Courier New, monospace",
    file:        "fonts/dm-mono/dm-mono-latin-400-normal.ttf",
    fileItalic:  "fonts/dm-mono/dm-mono-latin-400-italic.ttf",
  },
  "--font-playfair-display": {
    family: "Playfair Display",
    fallback: "Playfair Display, Georgia, serif",
    file:      "fonts/playfair-display/playfair-display-latin-400-normal.ttf",
    fileBold:  "fonts/playfair-display/playfair-display-latin-700-normal.ttf",
  },
  "--font-noto-sans-sc": {
    family: "Noto Sans SC",
    fallback: "Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif",
    file:      "fonts/noto-sans-sc/NotoSansSC-Regular.ttf",
    fileBold:  "fonts/noto-sans-sc/NotoSansSC-Bold.ttf",
  },
  "--font-noto-serif-sc": {
    family: "Noto Serif SC",
    fallback: "Noto Serif SC, STSong, SimSun, serif",
    file:      "fonts/noto-serif-sc/NotoSerifSC-Regular.ttf",
    fileBold:  "fonts/noto-serif-sc/NotoSerifSC-Bold.ttf",
  },
}

/**
 * 根据字重和字形从 FontAsset 中选取对应的文件路径。
 * 若该变体不存在则降级：先找无斜体版本，再找无粗体版本，最终回退到 file。
 */
function pickVariantFile(asset: FontAsset, fontWeight: number, fontStyle: string): string | null {
  const isBold = fontWeight >= 600
  const isItalic = fontStyle === "italic" || fontStyle === "oblique"

  if (isBold && isItalic) {
    if (asset.fileBoldItalic !== undefined) return asset.fileBoldItalic
    if (asset.fileBold !== undefined) return asset.fileBold
    if (asset.fileItalic !== undefined) return asset.fileItalic
    return asset.file
  }
  if (isBold) {
    if (asset.fileBold !== undefined) return asset.fileBold
    return asset.file
  }
  if (isItalic) {
    if (asset.fileItalic !== undefined) return asset.fileItalic
    return asset.file
  }
  return asset.file
}

/**
 * 将 CSS 字体值解析为对应的字体文件路径（相对 public/）。
 *
 * - `"var(--font-ibm-plex-mono)"` → `"fonts/ibm-plex-mono/..."`
 * - `"IBM Plex Mono"` 或 `"IBM Plex Mono, Courier New, monospace"` → 同上
 * - 未登记字体 → `null`
 *
 * @param fontWeight 字重（400 = 常规，700 = 加粗），默认 400
 * @param fontStyle  字形（'normal' / 'italic'），默认 'normal'
 */
export function resolveFontFile(
  fontFamily: string,
  fontWeight: number = 400,
  fontStyle: string = "normal",
): string | null {
  if (!fontFamily) return null

  const trimmed = fontFamily.trim()

  // CSS var 形式：var(--font-xxx)
  if (trimmed.startsWith("var(")) {
    const varName = trimmed.slice(4).replace(/\)$/, "").trim()
    const asset = FONT_ASSETS[varName]
    if (!asset) return null
    return pickVariantFile(asset, fontWeight, fontStyle)
  }

  // 裸族名（可能带回退栈）：取第一段匹配
  const primary = (trimmed.split(",")[0] ?? "").trim().replace(/['"]/g, "")
  for (const asset of Object.values(FONT_ASSETS)) {
    if (asset.family.toLowerCase() === primary.toLowerCase()) {
      return pickVariantFile(asset, fontWeight, fontStyle)
    }
  }

  return null
}

/**
 * 将 CSS 字体值解析为族名。
 * 若字体不在资产表中，返回输入值的第一段（剥离回退栈）。
 */
export function resolveFontFamily(fontFamily: string): string {
  if (!fontFamily) return "Inter, system-ui, sans-serif"

  const trimmed = fontFamily.trim()

  if (trimmed.startsWith("var(")) {
    const varName = trimmed.slice(4).replace(/\)$/, "").trim()
    const asset = FONT_ASSETS[varName]
    return asset ? asset.fallback : "Inter, system-ui, sans-serif"
  }

  return trimmed
}
