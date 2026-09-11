/**
 * 设计器默认色值，与 packages/ui/src/styles/globals.css 中 --design-* token 一一对应。
 * Store 初始状态使用 hex 字符串（用户数据格式），值须与 CSS 变量视觉一致。
 */
export const DEFAULT_KEYCAP_COLORS = {
  /** --design-keycap-fill（整颗键帽本体色） */
  color: "#4a4a4a",
  /** --design-keycap-stroke */
  borderColor: "#222222",
  /** --design-keycap-label */
  labelColor: "#d0d0d0",
} as const

/** 新建设计的默认键盘外壳涂装。 */
export const DEFAULT_KEYBOARD_CASE_PAINT = "#2c2c2c"
