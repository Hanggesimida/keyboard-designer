/**
 * 设计器领域类型（与 React / Three.js 无关）。
 *
 * 坐标契约（全项目统一）：
 * - 设计坐标：X 向右、Y 向下；单位为 u（1u = 布局网格一格）。
 * - Three 坐标：X 向右、Y 向上、Z 朝使用者（空格侧）；`1u = 1 world unit`。
 * - 键帽原点：底面中心（与 GLB 资产一致；Three 中 y = 0 贴地）。
 */

/** 布局中已知的键帽外形；未知值在适配层归一为 `"rect"` */
export type KeyShape = "rect" | "iso" | "stepped"

export type KeySection = "base" | "supplement"

export interface KeyDef {
  keyId: string
  label: string
  /** 设计坐标 X（u），向右为正 */
  x: number
  /** 设计坐标 Y（u），向下为正 */
  y: number
  /** 键宽（u） */
  w: number
  /** 键高（u） */
  h: number
  /** 原始 shape 字符串；未知值由 normalizeKeyShape 处理 */
  shape: string
  rowLevel?: string
  /** 键所属区域：标准键盘区（base）或增补键帽区（supplement） */
  section?: KeySection
}

/** 将 layout / JSON 中的 shape 归一为已知联合类型；未知 → `"rect"` */
export function normalizeKeyShape(shape: string | undefined | null): KeyShape {
  if (shape === "iso" || shape === "stepped" || shape === "rect") return shape
  return "rect"
}
