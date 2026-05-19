export type FontCategory = "sans" | "mono" | "serif" | "cjk" | "system"

export interface FontOption {
  value: string
  label: string
  category: FontCategory
}

export const FONT_CATEGORIES: { key: FontCategory; label: string }[] = [
  { key: "sans", label: "无衬线" },
  { key: "mono", label: "等宽" },
  { key: "serif", label: "衬线" },
  { key: "cjk", label: "中文" },
  { key: "system", label: "系统" },
]

export const FONT_OPTIONS: FontOption[] = [
  // 无衬线
  { value: "var(--font-inter)", label: "Inter", category: "sans" },
  { value: "var(--font-roboto)", label: "Roboto", category: "sans" },
  { value: "var(--font-space-grotesk)", label: "Space Grotesk", category: "sans" },
  { value: "var(--font-oxanium)", label: "Oxanium", category: "sans" },
  { value: "var(--font-orbitron)", label: "Orbitron", category: "sans" },
  // 等宽
  { value: "var(--font-ibm-plex-mono)", label: "IBM Plex Mono", category: "mono" },
  { value: "var(--font-jetbrains-mono)", label: "JetBrains Mono", category: "mono" },
  { value: "var(--font-fira-code)", label: "Fira Code", category: "mono" },
  { value: "var(--font-dm-mono)", label: "DM Mono", category: "mono" },
  // 衬线
  { value: "var(--font-playfair-display)", label: "Playfair Display", category: "serif" },
  { value: "Georgia, serif", label: "Georgia", category: "serif" },
  // 中文
  { value: "var(--font-noto-sans-sc)", label: "Noto Sans SC", category: "cjk" },
  { value: "var(--font-noto-serif-sc)", label: "Noto Serif SC", category: "cjk" },
  // 系统
  { value: "system-ui, sans-serif", label: "系统字体", category: "system" },
]
