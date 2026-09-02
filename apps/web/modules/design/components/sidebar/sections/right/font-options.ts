export type FontCategory = "sans" | "mono" | "serif" | "cjk" | "custom"

export interface FontOption {
  value: string
  label: string
  category: FontCategory
  /** 是否有 700（加粗）字重变体 */
  bold: boolean
  /** 是否有斜体变体 */
  italic: boolean
}

export const FONT_CATEGORIES: { key: FontCategory }[] = [
  { key: "custom" },
  { key: "sans" },
  { key: "mono" },
  { key: "serif" },
  { key: "cjk" },
]

export const FONT_OPTIONS: FontOption[] = [
  // 无衬线
  { value: "var(--font-inter)",         label: "Inter",           category: "sans", bold: true,  italic: true  },
  { value: "var(--font-space-grotesk)", label: "Space Grotesk",   category: "sans", bold: true,  italic: false },
  { value: "var(--font-oxanium)",       label: "Oxanium",         category: "sans", bold: true,  italic: false },
  { value: "var(--font-orbitron)",      label: "Orbitron",        category: "sans", bold: true,  italic: false },
  // 等宽
  { value: "var(--font-ibm-plex-mono)",  label: "IBM Plex Mono",  category: "mono", bold: true,  italic: true  },
  { value: "var(--font-jetbrains-mono)", label: "JetBrains Mono", category: "mono", bold: true,  italic: true  },
  { value: "var(--font-dm-mono)",        label: "DM Mono",        category: "mono", bold: false, italic: true  },
  // 衬线
  { value: "var(--font-playfair-display)", label: "Playfair Display", category: "serif", bold: true, italic: false },
  // 中文
  { value: "var(--font-noto-sans-sc)",  label: "Noto Sans SC",   category: "cjk",  bold: true,  italic: false },
  { value: "var(--font-noto-serif-sc)", label: "Noto Serif SC",  category: "cjk",  bold: true,  italic: false },
]

/**
 * 根据当前字体 CSS 值返回其支持的 bold/italic 能力。
 * 用户字体 V1：无粗/斜变体。
 * 未在 FONT_OPTIONS 中找到的字体默认两者均支持（宽松策略）。
 */
export function getFontCapabilities(fontCssValue: string): { bold: boolean; italic: boolean } {
  if (fontCssValue.startsWith("uf:")) {
    return { bold: false, italic: false }
  }
  const opt = FONT_OPTIONS.find((f) => f.value === fontCssValue)
  return opt ? { bold: opt.bold, italic: opt.italic } : { bold: true, italic: true }
}
