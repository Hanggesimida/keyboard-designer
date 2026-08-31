/**
 * 治具键帽几何解析与画布→治具坐标映射。
 */

import { roundedPolygonPath, getIsoTopFaceRadii } from './keycap-geometry';

export const KEY_RADIUS_BASE_ISO = 1.5
export const KEY_RADIUS_TOP = 4

export interface JigPoint {
  x: number
  y: number
}

export interface JigPosition {
  key_id: string
  unit?: number
  row_level?: string
  shape?: string
  geometry_group?: string
  top_face_x?: number
  top_face_y?: number
  top_face_w?: number
  top_face_h?: number
  top_face_rx?: number
  top_face_points?: JigPoint[]
  bottom_box_x?: number
  bottom_box_y?: number
  bottom_box_w?: number
  bottom_box_h?: number
  base_points?: JigPoint[]
  base_box_x?: number
  base_box_y?: number
  base_box_w?: number
  base_box_h?: number
  base_box_rx?: number
  label_cx?: number
  label_cy?: number
}

export interface LayoutKey {
  x: number
  y: number
  w: number
  h: number
  label: string
  rowLevel?: string
  shape?: string
}

export interface JigRect {
  kind: "rect"
  x: number
  y: number
  w: number
  h: number
  rx?: number
}

export interface JigPoly {
  kind: "poly"
  points: JigPoint[]
  radius: number | number[]
}

export type JigShape = JigRect | JigPoly

export function pointsBBox(pts: JigPoint[]): { x: number; y: number; w: number; h: number } {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** 单键图坐标映射用的顶面参考框（矩形 or 多边形包围盒）。 */
export function resolveTopFaceMappingRect(pos: JigPosition): JigRect | null {
  const { top_face_x: x, top_face_y: y, top_face_w: w, top_face_h: h } = pos
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: pos.top_face_rx ?? 0 }
  }
  const pts = pos.top_face_points
  if (pts && pts.length > 0) {
    const bb = pointsBBox(pts)
    return { kind: "rect", ...bb, rx: 0 }
  }
  return null
}

/** 顶面：矩形优先，否则多边形。 */
export function resolveTopFace(pos: JigPosition, topScale: number): JigShape | null {
  const { top_face_x: x, top_face_y: y, top_face_w: w, top_face_h: h } = pos
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: pos.top_face_rx ?? 0 }
  }
  const pts = pos.top_face_points
  if (pts && pts.length > 0) {
    return {
      kind: "poly",
      points: pts,
      radius: getIsoTopFaceRadii(KEY_RADIUS_TOP * topScale),
    }
  }
  return null
}

/** 底座：矩形优先，否则圆角多边形。 */
export function resolveBottomFace(pos: JigPosition, topScale: number): JigShape | null {
  const { bottom_box_x: x, bottom_box_y: y, bottom_box_w: w, bottom_box_h: h } = pos
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: 0 }
  }
  const pts = pos.base_points
  if (pts && pts.length > 0) {
    return { kind: "poly", points: pts, radius: KEY_RADIUS_BASE_ISO * topScale }
  }
  return null
}

/** 全局图映射用的底座参考框。 */
export function resolveBaseBox(pos: JigPosition): JigRect | null {
  const { base_box_x: x, base_box_y: y, base_box_w: w, base_box_h: h } = pos
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: pos.base_box_rx ?? 0 }
  }
  const pts = pos.base_points
  if (pts && pts.length > 0) {
    const bb = pointsBBox(pts)
    return { kind: "rect", ...bb, rx: 0 }
  }
  return null
}

/** 单键图 clip：顶面 or 底座（含 bottom_box 扩展）。 */
export function resolvePerKeyClipShape(
  pos: JigPosition,
  topScale: number,
  clipToTopFace: boolean,
): JigShape | null {
  if (clipToTopFace) {
    const top = resolveTopFace(pos, topScale)
    if (top) return top
    return null
  }

  const bottom = resolveBottomFace(pos, topScale)
  if (bottom) return bottom

  return resolveTopFace(pos, topScale)
}

/** 全局图 clip：多边形底座 or bottom_box / base_box。 */
export function resolveGlobalClipShape(pos: JigPosition, topScale: number): JigShape | null {
  const bpts = pos.base_points
  if (bpts && bpts.length > 0 && pos.base_box_x == null) {
    return { kind: "poly", points: bpts, radius: KEY_RADIUS_BASE_ISO * topScale }
  }

  const { bottom_box_x: bx, bottom_box_y: by, bottom_box_w: bw, bottom_box_h: bh } = pos
  if (bx != null && by != null && bw != null && bh != null) {
    return { kind: "rect", x: bx, y: by, w: bw, h: bh, rx: 0 }
  }

  return resolveBaseBox(pos)
}

export function shapeToBBox(shape: JigShape): JigRect {
  if (shape.kind === "rect") return shape
  const bb = pointsBBox(shape.points)
  return { kind: "rect", ...bb, rx: 0 }
}

export function renderShape(shape: JigShape, fill: string, extra = ""): string {
  if (shape.kind === "rect") {
    let attrs =
      `x="${shape.x.toFixed(4)}" y="${shape.y.toFixed(4)}" ` +
      `width="${shape.w.toFixed(4)}" height="${shape.h.toFixed(4)}" fill="${fill}"`
    if (shape.rx) attrs += ` rx="${shape.rx.toFixed(4)}"`
    if (extra) attrs += ` ${extra}`
    return `  <rect ${attrs}/>`
  }
  const d = roundedPolygonPath(shape.points, shape.radius)
  let attrs = `d="${d}" fill="${fill}"`
  if (extra) attrs += ` ${extra}`
  return `  <path ${attrs}/>`
}

export function pushClipPathDef(defsLines: string[], clipId: string, shape: JigShape): void {
  defsLines.push(`    <clipPath id="${clipId}">`)
  if (shape.kind === "rect") {
    const rx = shape.rx ?? 0
    defsLines.push(
      `      <rect x="${shape.x.toFixed(4)}" y="${shape.y.toFixed(4)}" ` +
      `width="${shape.w.toFixed(4)}" height="${shape.h.toFixed(4)}" rx="${rx.toFixed(4)}"/>`,
    )
  } else {
    const d = roundedPolygonPath(shape.points, shape.radius)
    defsLines.push(`      <path d="${d}"/>`)
  }
  defsLines.push(`    </clipPath>`)
}

/** 竖键横放：设计区竖向，治具槽横向。 */
export function isJigRotated(km: LayoutKey, pos: JigPosition): boolean {
  if (km.h <= km.w) return false
  const jw = pos.top_face_w ?? pos.bottom_box_w
  const jh = pos.top_face_h ?? pos.bottom_box_h
  if (jw == null || jh == null) return false
  return jw > jh
}

export interface ImageJigMappingInput {
  imgSvgX: number
  imgSvgY: number
  imgW: number
  imgH: number
  rotation?: number
  designRef: { x: number; y: number; w: number; h: number }
  jigRef: { x: number; y: number; w: number; h: number }
  jigRotated: boolean
  topScale: number
}

/** 将画布图片坐标映射到治具坐标系。 */
export function mapCanvasImageToJig(input: ImageJigMappingInput): {
  x: number
  y: number
  w: number
  h: number
  rotation: number
} {
  const {
    imgSvgX, imgSvgY, imgW, imgH,
    rotation = 0,
    designRef, jigRef,
    jigRotated, topScale,
  } = input
  const { x: dX, y: dY, w: dW, h: dH } = designRef
  const { x: jX, y: jY, w: jW, h: jH } = jigRef

  if (jigRotated) {
    const sxH = dH ? jW / dH : topScale
    const sxW = dW ? jH / dW : topScale
    const relX = imgSvgX - dX
    const relY = imgSvgY - dY
    const relCX = relX + imgW / 2
    const relCY = relY + imgH / 2
    const jigRelCX = relCY * sxH
    const jigRelCY = (dW - relCX) * sxW
    const w = imgW * sxW
    const h = imgH * sxH
    return {
      x: jX + jigRelCX - w / 2,
      y: jY + jigRelCY - h / 2,
      w,
      h,
      rotation: rotation - 90,
    }
  }

  const sx = dW ? jW / dW : topScale
  const sy = dH ? jH / dH : topScale
  const relX = imgSvgX - dX
  const relY = imgSvgY - dY
  return {
    x: jX + relX * sx,
    y: jY + relY * sy,
    w: imgW * sx,
    h: imgH * sy,
    rotation,
  }
}
