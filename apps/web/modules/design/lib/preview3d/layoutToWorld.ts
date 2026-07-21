/**
 * 布局网格 → Three.js 世界坐标（纯函数，无 React）。
 *
 * 坐标契约：
 * - 设计：X 向右、Y 向下（单位 u）
 * - Three：X 向右、Y 向上、Z 朝使用者（空格侧）
 * - `1u = 1 world unit`
 * - 键帽原点：底面中心（与 GLB 资产一致；y = 0 贴地）
 */

import { KEYCAP_GAP } from "@/modules/design/lib/design/keycapGeometry"
import { getLayoutBounds } from "@/modules/design/lib/design/layout"
import type { KeyDef } from "@/modules/design/types/design"
import { PLACEHOLDER_KEY_HEIGHT } from "./constants"

export type Vec3 = [number, number, number]

export interface KeyWorldTransform {
  position: Vec3
  size: Vec3
}

/** 世界坐标系下键盘完整 bounds（一次遍历） */
export interface KeyboardWorldBounds {
  min: Vec3
  max: Vec3
  center: Vec3
  width: number
  depth: number
}

/** 可视尺寸下限，避免零/负尺寸导致不可见或 NaN */
const MIN_KEY_SIZE_U = 0.01

/**
 * 将 KeyDef 映射到世界坐标变换。
 * - 负/非法 w、h → 0 后再套最小尺寸
 * - gap 从 SVG 单位换算为 u：`KEYCAP_GAP / baseUnit`
 */
export function keyDefToWorld(key: KeyDef, baseUnit: number): KeyWorldTransform {
  const safeBase = Number.isFinite(baseUnit) && baseUnit > 0 ? baseUnit : 54
  const gapU = KEYCAP_GAP / safeBase

  const w = Number.isFinite(key.w) ? Math.max(key.w, 0) : 0
  const h = Number.isFinite(key.h) ? Math.max(key.h, 0) : 0
  const x = Number.isFinite(key.x) ? key.x : 0
  const y = Number.isFinite(key.y) ? key.y : 0

  const sx = Math.max(w - gapU, MIN_KEY_SIZE_U)
  const sz = Math.max(h - gapU, MIN_KEY_SIZE_U)
  const sy = PLACEHOLDER_KEY_HEIGHT

  return {
    // Y = 0：底面中心贴地（GLB 与占位盒均按此约定放置）
    position: [x + w / 2, 0, y + h / 2],
    size: [sx, sy, sz],
  }
}

/**
 * 一次遍历得到完整世界 bounds。
 * 空布局：center `[0,0,0]`，宽深各 `1`。
 */
export function getKeyboardBounds(keys: KeyDef[]): KeyboardWorldBounds {
  if (keys.length === 0) {
    return {
      min: [0, 0, 0],
      max: [1, 0, 1],
      center: [0, 0, 0],
      width: 1,
      depth: 1,
    }
  }

  const b = getLayoutBounds(keys)
  return {
    min: [b.minX, 0, b.minY],
    max: [b.maxX, 0, b.maxY],
    center: [(b.minX + b.maxX) / 2, 0, (b.minY + b.maxY) / 2],
    width: b.width,
    depth: b.height,
  }
}
