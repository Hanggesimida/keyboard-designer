export const FONT_SIZE_MIN = 6
export const FONT_SIZE_MAX = 32

/** 对齐时文字边缘与顶面边缘保留的内边距（SVG 单位） */
export const LABEL_ALIGN_PAD = 5

export function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
