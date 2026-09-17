/**
 * 布局键位旋转（纯函数）。
 *
 * - 设计坐标：X 右、Y 下；`rotationDeg > 0` 为顺时针（与 SVG / Canvas 一致）
 * - 枢轴：槽中心 `(x + w/2, y + h/2)`
 * - Three：`rotationY = -rotationDeg * π / 180`
 */

export interface KeySlot {
  x: number
  y: number
  w: number
  h: number
  rotationDeg?: number
}

export interface Point2D {
  x: number
  y: number
}

export interface AxisAlignedBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function normalizeRotationDeg(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export function getKeySlotCenterU(key: KeySlot): Point2D {
  const w = Number.isFinite(key.w) ? Math.max(key.w, 0) : 0
  const h = Number.isFinite(key.h) ? Math.max(key.h, 0) : 0
  const x = Number.isFinite(key.x) ? key.x : 0
  const y = Number.isFinite(key.y) ? key.y : 0
  return { x: x + w / 2, y: y + h / 2 }
}

export function getKeySlotCenterPx(key: KeySlot, unit: number): Point2D {
  const center = getKeySlotCenterU(key)
  const safeUnit = Number.isFinite(unit) && unit > 0 ? unit : 54
  return { x: center.x * safeUnit, y: center.y * safeUnit }
}

/**
 * 绕枢轴顺时针旋转一点（Y 向下）。
 * θ=90° 时 (1,0) → (0,1)。
 */
export function rotatePoint2D(
  x: number,
  y: number,
  cx: number,
  cy: number,
  deg: number,
): Point2D {
  const angle = normalizeRotationDeg(deg)
  if (angle === 0) return { x, y }
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function rotatePoints2D(
  points: ReadonlyArray<Point2D>,
  cx: number,
  cy: number,
  deg: number,
): Point2D[] {
  const angle = normalizeRotationDeg(deg)
  if (angle === 0) return points.map((point) => ({ x: point.x, y: point.y }))
  return points.map((point) => rotatePoint2D(point.x, point.y, cx, cy, angle))
}

export function getRotatedRectBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg?: number,
  pivotX: number = x + w / 2,
  pivotY: number = y + h / 2,
): AxisAlignedBounds {
  const angle = normalizeRotationDeg(rotationDeg)
  if (angle === 0) {
    return { minX: x, minY: y, maxX: x + w, maxY: y + h }
  }
  const corners = rotatePoints2D(
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    pivotX,
    pivotY,
    angle,
  )
  return {
    minX: Math.min(corners[0]!.x, corners[1]!.x, corners[2]!.x, corners[3]!.x),
    minY: Math.min(corners[0]!.y, corners[1]!.y, corners[2]!.y, corners[3]!.y),
    maxX: Math.max(corners[0]!.x, corners[1]!.x, corners[2]!.x, corners[3]!.x),
    maxY: Math.max(corners[0]!.y, corners[1]!.y, corners[2]!.y, corners[3]!.y),
  }
}

/** 设计坐标（u）下键槽旋转后的轴对齐包围盒。 */
export function getKeySlotBoundsU(key: KeySlot): AxisAlignedBounds {
  const w = Number.isFinite(key.w) ? Math.max(key.w, 0) : 0
  const h = Number.isFinite(key.h) ? Math.max(key.h, 0) : 0
  const x = Number.isFinite(key.x) ? key.x : 0
  const y = Number.isFinite(key.y) ? key.y : 0
  return getRotatedRectBounds(x, y, w, h, key.rotationDeg)
}

export function svgKeyRotateTransform(
  key: KeySlot,
  unit: number,
): string | undefined {
  const deg = normalizeRotationDeg(key.rotationDeg)
  if (deg === 0) return undefined
  const center = getKeySlotCenterPx(key, unit)
  return `rotate(${deg},${center.x},${center.y})`
}

export function threeKeyRotationYRad(rotationDeg?: number): number {
  return (-normalizeRotationDeg(rotationDeg) * Math.PI) / 180
}

/** 将矩形绕枢轴旋转；宽高不变，中心与角度一起转。 */
export function rotateRectAroundPivot(
  rect: {
    x: number
    y: number
    width: number
    height: number
    rotationDeg?: number
  },
  pivot: Point2D,
  deg: number,
): {
  x: number
  y: number
  width: number
  height: number
  rotationDeg: number
} {
  const angle = normalizeRotationDeg(deg)
  const rotationDeg = (rect.rotationDeg ?? 0) + angle
  if (angle === 0) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotationDeg,
    }
  }
  const center = rotatePoint2D(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
    pivot.x,
    pivot.y,
    angle,
  )
  return {
    x: center.x - rect.width / 2,
    y: center.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
    rotationDeg,
  }
}
