import type { KeyDef } from "@/modules/design/types/design"
import { getLayoutPixelSize } from "./layout"
import {
  getKeySlotCenterPx,
  getRotatedRectBounds,
  normalizeRotationDeg,
  rotatePoints2D,
  rotateRectAroundPivot,
  type Point2D,
} from "./keyTransform"
import {
  getIsoBasePoints,
  getIsoTopFacePoints,
  getIsoTopFaceRadii,
  getTopFaceRects,
  KEYCAP_GAP,
  KEY_RADIUS_BASE,
  KEY_RADIUS_TOP,
  roundedPolygonPath,
} from "./keycapGeometry"

/** 画板内键盘区域相对画板左上角的偏移（px）。 */
export const DESIGN_ART_PAD = 28

/** 与 Three.Matrix3.elements 一致的列主序 3×3 仿射矩阵。 */
export type TextureMatrixElements = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export interface ProjectableImageElement {
  id: string
  type: "image"
  assetId: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  rotation?: number
  clipToKeycaps?: boolean
  clipToKeycapId?: string
  clipToKeycapIds?: string[]
  clipToTopFace?: boolean
}

export interface ImageProjectionItem {
  elementId: string
  assetId: string
  src: string
  /** 键盘 SVG 坐标（不含 artPad）。 */
  x: number
  y: number
  width: number
  height: number
  rotationDeg: number
  opacity: number
  /** 同一项内的路径按并集裁剪。 */
  clipPaths: readonly string[]
}

export interface ImageProjectionAtlasSpec {
  items: readonly ImageProjectionItem[]
  svgWidth: number
  svgHeight: number
  /** Three 世界 XZ → 图集 UV；已适配 Texture.flipY=true。 */
  matrixElements: TextureMatrixElements
  revision: string
}

export interface ProjectionKey {
  keyId: string
  x: number
  y: number
  w: number
  h: number
  shape: string
  rotationDeg?: number
}

export interface BuildImageProjectionSpecInput {
  elements: ReadonlyArray<ProjectableImageElement>
  assetMap: Readonly<Record<string, string>>
  keys: ReadonlyArray<ProjectionKey>
  baseUnit: number
  artPad?: number
  liveDragOverrides?: Readonly<Record<string, { dx: number; dy: number }>>
}

function safeUnit(baseUnit: number): number {
  return Number.isFinite(baseUnit) && baseUnit > 0 ? baseUnit : 54
}

export function keyboardSvgSize(
  keys: ReadonlyArray<Pick<KeyDef, "x" | "y" | "w" | "h" | "rotationDeg">>,
  baseUnit: number,
): { width: number; height: number } {
  return getLayoutPixelSize(keys, safeUnit(baseUnit))
}

/**
 * 键盘 SVG 矩形映射到世界 XZ 后，再转换为纹理 UV。
 * SVG Y 向下且 Texture.flipY=true，因此返回矩阵会翻转 V。
 */
export function svgRectToWorldTextureMatrix(
  svgX: number,
  svgY: number,
  svgWidth: number,
  svgHeight: number,
  baseUnit: number,
): TextureMatrixElements {
  const unit = safeUnit(baseUnit)
  const leftU = svgX / unit
  const topU = svgY / unit
  const widthU = Math.max(svgWidth / unit, 1e-6)
  const heightU = Math.max(svgHeight / unit, 1e-6)

  return [
    1 / widthU,
    0,
    0,
    0,
    -1 / heightU,
    0,
    -leftU / widthU,
    1 + topU / heightU,
    1,
  ]
}

function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  const right = x + w
  const bottom = y + h
  return [
    `M ${x + r},${y}`,
    `H ${right - r}`,
    `A ${r},${r} 0 0 1 ${right},${y + r}`,
    `V ${bottom - r}`,
    `A ${r},${r} 0 0 1 ${right - r},${bottom}`,
    `H ${x + r}`,
    `A ${r},${r} 0 0 1 ${x},${bottom - r}`,
    `V ${y + r}`,
    `A ${r},${r} 0 0 1 ${x + r},${y}`,
    "Z",
  ].join(" ")
}

function rectCorners(x: number, y: number, w: number, h: number): Point2D[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

function transformClipPoints(
  points: ReadonlyArray<Point2D>,
  cx: number,
  cy: number,
  deg: number,
  originX: number,
  originY: number,
): Point2D[] {
  return rotatePoints2D(points, cx, cy, deg).map((point) => ({
    x: point.x - originX,
    y: point.y - originY,
  }))
}

export function keycapProjectionPaths(
  key: ProjectionKey,
  baseUnit: number,
  topFace: boolean,
  origin: { x?: number; y?: number } = {},
): string[] {
  const unit = safeUnit(baseUnit)
  const x = key.x * unit + KEYCAP_GAP / 2
  const y = key.y * unit + KEYCAP_GAP / 2
  const width = key.w * unit - KEYCAP_GAP
  const height = key.h * unit - KEYCAP_GAP
  const originX = origin.x ?? 0
  const originY = origin.y ?? 0
  const deg = normalizeRotationDeg(key.rotationDeg)
  const cx = key.x * unit + (key.w * unit) / 2
  const cy = key.y * unit + (key.h * unit) / 2

  const emitPolygon = (
    points: ReadonlyArray<Point2D>,
    radius: number | number[],
  ) =>
    roundedPolygonPath(
      transformClipPoints(points, cx, cy, deg, originX, originY),
      radius,
    )

  if (topFace) {
    if (key.shape === "iso") {
      return [
        emitPolygon(
          getIsoTopFacePoints(x, y, width, height),
          getIsoTopFaceRadii(KEY_RADIUS_TOP),
        ),
      ]
    }
    return getTopFaceRects(key.shape, x, y, width, height).map((rect) => {
      if (deg === 0) {
        return roundedRectPath(
          rect.x - originX,
          rect.y - originY,
          rect.w,
          rect.h,
          KEY_RADIUS_TOP,
        )
      }
      return emitPolygon(
        rectCorners(rect.x, rect.y, rect.w, rect.h),
        KEY_RADIUS_TOP,
      )
    })
  }

  if (key.shape === "iso") {
    return [
      emitPolygon(getIsoBasePoints(x, y, width, height), KEY_RADIUS_BASE),
    ]
  }
  if (deg === 0) {
    return [roundedRectPath(x - originX, y - originY, width, height, KEY_RADIUS_BASE)]
  }
  return [emitPolygon(rectCorners(x, y, width, height), KEY_RADIUS_BASE)]
}

/** 与 2D 画布一致：显式限制优先，否则按未旋转图片矩形与键帽底座 AABB 相交。 */
export function resolveProjectionKeys(
  element: ProjectableImageElement,
  keys: ReadonlyArray<ProjectionKey>,
  baseUnit: number,
  options?: {
    artPad?: number
    liveDx?: number
    liveDy?: number
  },
): ProjectionKey[] {
  const explicitIds =
    element.clipToKeycapIds && element.clipToKeycapIds.length > 0
      ? element.clipToKeycapIds
      : element.clipToKeycapId
        ? [element.clipToKeycapId]
        : null
  if (explicitIds) {
    const ids = new Set(explicitIds)
    return keys.filter((key) => ids.has(key.keyId))
  }

  const unit = safeUnit(baseUnit)
  const artPad = options?.artPad ?? DESIGN_ART_PAD
  const imageX = element.x + (options?.liveDx ?? 0) - artPad
  const imageY = element.y + (options?.liveDy ?? 0) - artPad

  return keys.filter((key) => {
    const bounds = getRotatedRectBounds(
      key.x * unit + KEYCAP_GAP / 2,
      key.y * unit + KEYCAP_GAP / 2,
      key.w * unit - KEYCAP_GAP,
      key.h * unit - KEYCAP_GAP,
      key.rotationDeg,
    )
    return (
      imageX < bounds.maxX &&
      imageX + element.width > bounds.minX &&
      imageY < bounds.maxY &&
      imageY + element.height > bounds.minY
    )
  })
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.max(0, Math.min(1, value))
}

export function buildImageProjectionAtlasSpec(
  input: BuildImageProjectionSpecInput,
): ImageProjectionAtlasSpec {
  const baseUnit = safeUnit(input.baseUnit)
  const artPad = input.artPad ?? DESIGN_ART_PAD
  const { width: svgWidth, height: svgHeight } = keyboardSvgSize(
    input.keys,
    baseUnit,
  )
  const items: ImageProjectionItem[] = []

  for (const element of input.elements) {
    const participates =
      (element.clipToKeycaps ?? true) &&
      !!(element.clipToKeycaps || element.clipToKeycapId)
    const src = input.assetMap[element.assetId]
    if (
      !participates ||
      !src ||
      !(element.width > 0) ||
      !(element.height > 0)
    ) {
      continue
    }

    const live = input.liveDragOverrides?.[element.id]
    const matchedKeys = resolveProjectionKeys(element, input.keys, baseUnit, {
      artPad,
      liveDx: live?.dx,
      liveDy: live?.dy,
    })
    const clipPaths = matchedKeys.flatMap((key) =>
      keycapProjectionPaths(key, baseUnit, !!element.clipToTopFace),
    )
    if (clipPaths.length === 0) continue

    const imageRect = {
      x: element.x + (live?.dx ?? 0) - artPad,
      y: element.y + (live?.dy ?? 0) - artPad,
      width: element.width,
      height: element.height,
      rotationDeg: element.rotation ?? 0,
    }
    const boundKey = element.clipToKeycapId
      ? matchedKeys.find((key) => key.keyId === element.clipToKeycapId)
      : undefined
    const placed = boundKey
      ? rotateRectAroundPivot(
          imageRect,
          getKeySlotCenterPx(boundKey, baseUnit),
          normalizeRotationDeg(boundKey.rotationDeg),
        )
      : imageRect

    items.push({
      elementId: element.id,
      assetId: element.assetId,
      src,
      x: placed.x,
      y: placed.y,
      width: placed.width,
      height: placed.height,
      rotationDeg: placed.rotationDeg,
      opacity: clamp01(element.opacity),
      clipPaths,
    })
  }

  const matrixElements = svgRectToWorldTextureMatrix(
    0,
    0,
    svgWidth,
    svgHeight,
    baseUnit,
  )
  const revision = [
    svgWidth,
    svgHeight,
    ...items.map((item) =>
      [
        item.elementId,
        item.assetId,
        item.x,
        item.y,
        item.width,
        item.height,
        item.rotationDeg,
        item.opacity,
        item.clipPaths.join(";"),
      ].join(":"),
    ),
  ].join("|")

  return { items, svgWidth, svgHeight, matrixElements, revision }
}
