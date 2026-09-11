import type { LayoutData } from "@/modules/design/data/layouts"
import type { KeyDef, KeySection } from "@/modules/design/types/design"

/** 设计坐标系下的布局包围盒（单位：u） */
export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  /** maxX - minX */
  width: number
  /** maxY - minY */
  height: number
}

export interface LayoutPixelSize {
  width: number
  height: number
}

type LayoutRect = Pick<KeyDef, "x" | "y" | "w" | "h">

const EMPTY_LAYOUT_BOUNDS: LayoutBounds = {
  minX: 0,
  minY: 0,
  maxX: 1,
  maxY: 1,
  width: 1,
  height: 1,
}

/**
 * 将 layout.rows 扁平为 KeyDef[]，并写入 row.section（默认 `"base"`）。
 * 2D 画布与 3D 预览共用，避免各自重复 flatMap。
 */
export function flattenLayout(layout: LayoutData): KeyDef[] {
  return layout.rows.flatMap((row) => {
    const section: KeySection = row.section ?? "base"
    return row.keys.map((key) => ({
      ...key,
      section,
      // 负尺寸显式兜底为 0，避免下游包围盒/世界坐标异常
      w: Number.isFinite(key.w) ? Math.max(key.w, 0) : 0,
      h: Number.isFinite(key.h) ? Math.max(key.h, 0) : 0,
      x: Number.isFinite(key.x) ? key.x : 0,
      y: Number.isFinite(key.y) ? key.y : 0,
    }))
  })
}

/**
 * 一次遍历得到完整设计坐标 bounds。
 * 空布局返回 1×1 占位包围盒，避免除零与相机 fit 崩溃。
 */
export function getLayoutBounds(
  keys: ReadonlyArray<LayoutRect>,
): LayoutBounds {
  if (keys.length === 0) return { ...EMPTY_LAYOUT_BOUNDS }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const k of keys) {
    const w = Number.isFinite(k.w) ? Math.max(k.w, 0) : 0
    const h = Number.isFinite(k.h) ? Math.max(k.h, 0) : 0
    const x = Number.isFinite(k.x) ? k.x : 0
    const y = Number.isFinite(k.y) ? k.y : 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + w)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + h)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return { ...EMPTY_LAYOUT_BOUNDS }
  }

  const width = Math.max(maxX - minX, 0)
  const height = Math.max(maxY - minY, 0)

  // 零跨度时给最小 1u
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: width > 0 ? width : 1,
    height: height > 0 ? height : 1,
  }
}

/** 使用 tight bounds 计算布局像素尺寸，供画板、缩略图与纹理图集共用。 */
export function getLayoutPixelSize(
  keys: ReadonlyArray<LayoutRect>,
  baseUnit: number,
): LayoutPixelSize {
  const unit = Number.isFinite(baseUnit) && baseUnit > 0 ? baseUnit : 54
  const bounds = getLayoutBounds(keys)
  return {
    width: Math.max(1, Math.ceil(bounds.width * unit)),
    height: Math.max(1, Math.ceil(bounds.height * unit)),
  }
}
