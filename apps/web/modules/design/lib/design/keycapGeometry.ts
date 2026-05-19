/** 键帽间距（SVG 单位） */
export const KEYCAP_GAP = 2

/** 顶面内边距（SVG 单位） */
export const KEY_PAD_LEFT = 9
export const KEY_PAD_TOP = 6
export const KEY_PAD_RIGHT = 9
export const KEY_PAD_BOTTOM = 10

/** 圆角半径 */
export const KEY_RADIUS_BASE = 6
export const KEY_RADIUS_TOP = 4

/** 默认标签字号 */
export const KEY_LABEL_SIZE = 9

/**
 * 标签相对几何中心的向上微调系数：
 * font metrics 居中 ≠ 视觉居中（大写无 descender 时尤甚）
 */
export const KEY_LABEL_OPTICAL_CENTER_RATIO = 0.09

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
