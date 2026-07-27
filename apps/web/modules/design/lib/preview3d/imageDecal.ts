/**
 * 画布图片 → 键盘世界平面贴花（纯函数，无 Three / React）。
 *
 * 坐标链：
 * - CanvasImageElement：画板 px（含 artPad）
 * - SVG 键盘空间：px - artPad；与 key.x * baseUnit 对齐
 * - 世界 XZ：1u = 1；设计 Y → Three Z
 *
 * 矩阵语义：`uv = M * vec3(worldX, worldZ, 1)`，且已按 Three.js
 * `Texture.flipY = true` 约定把 V 翻成「v=0 在图像底」。
 */

/** 与 DesignCanvas `ART_PAD` 保持一致 */
export const DESIGN_ART_PAD = 28

/**
 * 仅用于 3D 贴花矩阵：相对 2D 摆放，向四周外扩的世界单位（u）。
 * 给侧壁外翻留邻域像素；2D 裁剪与作用键仍按原始矩形。
 */
export const DECAL_3D_EXPAND_MARGIN_U = 0.12

/** 贴花在预览层的纯数据描述（不含 Texture 对象） */
export interface PreviewImageDecal {
  /** assetMap 中的 data URL / 远程 URL */
  textureUrl: string
  /**
   * 列主序 3×3 仿射矩阵（与 Three.Matrix3.elements 一致）：
   * `[n11,n21,n31, n12,n22,n32, n13,n23,n33]`
   */
  matrixElements: readonly [
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
  opacity: number
  /** 源元素 id，便于调试 / revision */
  elementId: string
  /**
   * 与 2D clip 一致：仅这些键帽启用贴花。
   * 空数组表示无键命中（不贴）。
   */
  keyIds: readonly string[]
}

export interface ImageElementLike {
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
}

/** 与 2D ClippedImagesLayer 相交检测共用的键位摘要 */
export interface DecalKeyFootprint {
  keyId: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * 选取首版 3D 贴花：视觉最顶、裁到全部键帽、非单键裁切的图片。
 * `canvasElements` 末尾 = 视觉最顶。
 */
export function selectPrimaryDecalImage(
  elements: ReadonlyArray<ImageElementLike>,
): ImageElementLike | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    if (!el || el.type !== "image") continue
    if (el.clipToKeycapId) continue
    if (!el.clipToKeycaps) continue
    if (!(el.width > 0) || !(el.height > 0)) continue
    return el
  }
  return null
}

export interface ImageToWorldMatrixInput {
  /** 画板坐标 px（含 artPad） */
  x: number
  y: number
  width: number
  height: number
  /** 度；SVG / CSS 同号（Y 向下时为正顺时针） */
  rotationDeg?: number
  baseUnit: number
  artPad?: number
  /** 实时拖拽偏移（画板 px），默认 0 */
  liveDx?: number
  liveDy?: number
  /**
   * 3D 专用：绕中心向四周外扩（世界 u）。
   * 默认 `DECAL_3D_EXPAND_MARGIN_U`；传 0 则与 2D 矩形严格对齐。
   */
  expandMarginU?: number
}

/**
 * 构建世界 XZ → UV 的列主序 3×3 矩阵元素。
 *
 * 未翻转 V 时：v=0 对应图像顶（设计 Y 小）。
 * 返回值已做 `v' = 1 - v`，以匹配 Three `flipY=true`。
 * 可选 `expandMarginU`：仅放大 3D 采样覆盖，不改变 2D 元素数据。
 */
export function imageElementToWorldTextureMatrixElements(
  input: ImageToWorldMatrixInput,
): PreviewImageDecal["matrixElements"] {
  const baseUnit =
    Number.isFinite(input.baseUnit) && input.baseUnit > 0 ? input.baseUnit : 54
  const artPad = input.artPad ?? DESIGN_ART_PAD
  const liveDx = input.liveDx ?? 0
  const liveDy = input.liveDy ?? 0
  const expand =
    input.expandMarginU === undefined
      ? DECAL_3D_EXPAND_MARGIN_U
      : Math.max(0, input.expandMarginU)

  const svgX = input.x + liveDx - artPad
  const svgY = input.y + liveDy - artPad
  const wPx = Math.max(input.width, 1e-6)
  const hPx = Math.max(input.height, 1e-6)

  const leftU = svgX / baseUnit
  const topU = svgY / baseUnit
  const widthU = wPx / baseUnit
  const heightU = hPx / baseUnit

  const cx = leftU + widthU / 2
  const cy = topU + heightU / 2
  // 绕中心外扩：同一键顶采样略向图心收，侧壁外翻更易落在图内
  const mapW = Math.max(widthU + expand * 2, 1e-6)
  const mapH = Math.max(heightU + expand * 2, 1e-6)

  const theta = ((input.rotationDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)

  // 设计空间（v=0 在顶）：
  // u = (x-cx)*cos/w + (z-cy)*sin/w + 0.5
  // v = (x-cx)*(-sin)/h + (z-cy)*cos/h + 0.5
  const m00 = cos / mapW
  const m01 = sin / mapW
  const m02 = 0.5 - cx * (cos / mapW) - cy * (sin / mapW)

  const m10 = -sin / mapH
  const m11 = cos / mapH
  const m12 = 0.5 + cx * (sin / mapH) - cy * (cos / mapH)

  // flipY=true：v_three = 1 - v_design
  const f10 = -m10
  const f11 = -m11
  const f12 = 1 - m12

  // 列主序：col0=(m00,f10,0), col1=(m01,f11,0), col2=(m02,f12,1)
  return [m00, f10, 0, m01, f11, 0, m02, f12, 1]
}

/** 将矩阵应用到世界点，返回 UV（已 flipY） */
export function applyWorldTextureMatrix(
  elements: PreviewImageDecal["matrixElements"],
  worldX: number,
  worldZ: number,
): { u: number; v: number } {
  const u = elements[0] * worldX + elements[3] * worldZ + elements[6]
  const v = elements[1] * worldX + elements[4] * worldZ + elements[7]
  return { u, v }
}

/**
 * 解析贴花应作用的键 id，语义对齐 2D `ClippedImagesLayer`：
 * - 显式 `clipToKeycapIds`
 * - 否则矩形与键帽底座（含 gap）AABB 相交
 */
export function resolveDecalKeyIds(
  el: ImageElementLike,
  keys: ReadonlyArray<DecalKeyFootprint>,
  baseUnit: number,
  options?: {
    artPad?: number
    liveDx?: number
    liveDy?: number
    /** SVG 单位 gap，默认与 KEYCAP_GAP=2 一致 */
    gapPx?: number
  },
): string[] {
  const artPad = options?.artPad ?? DESIGN_ART_PAD
  const liveDx = options?.liveDx ?? 0
  const liveDy = options?.liveDy ?? 0
  const gapPx = options?.gapPx ?? 2
  const unit =
    Number.isFinite(baseUnit) && baseUnit > 0 ? baseUnit : 54

  if (el.clipToKeycapIds && el.clipToKeycapIds.length > 0) {
    const idSet = new Set(el.clipToKeycapIds)
    return keys.filter((k) => idSet.has(k.keyId)).map((k) => k.keyId)
  }

  const imgSvgX = el.x + liveDx - artPad
  const imgSvgY = el.y + liveDy - artPad
  const imgW = el.width
  const imgH = el.height

  return keys
    .filter((key) => {
      const px = key.x * unit + gapPx / 2
      const py = key.y * unit + gapPx / 2
      const pw = key.w * unit - gapPx
      const ph = key.h * unit - gapPx
      return (
        imgSvgX < px + pw &&
        imgSvgX + imgW > px &&
        imgSvgY < py + ph &&
        imgSvgY + imgH > py
      )
    })
    .map((k) => k.keyId)
}

export interface BuildImageDecalsInput {
  canvasElements: ReadonlyArray<ImageElementLike>
  assetMap: Readonly<Record<string, string>>
  baseUnit: number
  /** 布局键位，用于与 2D 一致的相交裁剪 */
  keys: ReadonlyArray<DecalKeyFootprint>
  artPad?: number
  liveDragOverrides?: Readonly<Record<string, { dx: number; dy: number }>>
}

/**
 * 首版：最多一张全局键帽贴花。无可用图时返回空数组。
 */
export function buildImageDecals(
  input: BuildImageDecalsInput,
): PreviewImageDecal[] {
  const el = selectPrimaryDecalImage(input.canvasElements)
  if (!el) return []

  const textureUrl = input.assetMap[el.assetId]
  if (!textureUrl) return []

  const live = input.liveDragOverrides?.[el.id]
  const matrixElements = imageElementToWorldTextureMatrixElements({
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotationDeg: el.rotation ?? 0,
    baseUnit: input.baseUnit,
    artPad: input.artPad,
    liveDx: live?.dx,
    liveDy: live?.dy,
  })

  const opacity =
    Number.isFinite(el.opacity) ? Math.min(1, Math.max(0, el.opacity)) : 1

  const keyIds = resolveDecalKeyIds(el, input.keys, input.baseUnit, {
    artPad: input.artPad,
    liveDx: live?.dx,
    liveDy: live?.dy,
  })

  return [
    {
      textureUrl,
      matrixElements,
      opacity,
      elementId: el.id,
      keyIds,
    },
  ]
}
