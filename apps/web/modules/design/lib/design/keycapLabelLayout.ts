/**
 * 键帽刻字定位（2D SVG 与 3D 图集共用）。
 * 坐标系：设计 SVG（X 右、Y 下，单位 px = u * baseUnit）。
 */

import {
  KEYCAP_GAP,
  KEY_LABEL_OPTICAL_CENTER_RATIO,
  KEY_LABEL_SIZE,
  getTopFaceRects,
  type TopFaceRect,
} from "./keycapGeometry"

export interface KeycapBaseRect {
  px: number
  py: number
  pw: number
  ph: number
}

export function getKeycapBaseRect(
  key: { x: number; y: number; w: number; h: number },
  unit: number,
): KeycapBaseRect {
  const rawX = key.x * unit
  const rawY = key.y * unit
  const rawW = key.w * unit
  const rawH = key.h * unit
  return {
    px: rawX + KEYCAP_GAP / 2,
    py: rawY + KEYCAP_GAP / 2,
    pw: rawW - KEYCAP_GAP,
    ph: rawH - KEYCAP_GAP,
  }
}

export interface KeycapLabelDrawOriginInput {
  topX: number
  topY: number
  topW: number
  topH: number
  offsetX?: number
  offsetY?: number
  fontSize?: number
  lineHeightRatio?: number
  labelText: string
}

export interface KeycapLabelDrawOrigin {
  /** 顶面中心 + 偏移（水平居中锚点） */
  textX: number
  /** 顶面中心 + 偏移（未做光学/多行微调） */
  textY: number
  /** 第一行绘制 Y：光学上移 + 多行块居中 */
  textYDraw: number
  fontSize: number
  lineHeight: number
  lines: string[]
}

/**
 * 与 KeycapNode SVG `<text textAnchor="middle" dominantBaseline="central">` 对齐。
 */
export function computeKeycapLabelDrawOrigin(
  input: KeycapLabelDrawOriginInput,
): KeycapLabelDrawOrigin {
  const fontSize = input.fontSize ?? KEY_LABEL_SIZE
  const lineHeightRatio = input.lineHeightRatio ?? 1.2
  const lineHeight = fontSize * lineHeightRatio
  const lines = input.labelText.split("\n")
  const offsetX = input.offsetX ?? 0
  const offsetY = input.offsetY ?? 0
  const textX = input.topX + input.topW / 2 + offsetX
  const textY = input.topY + input.topH / 2 + offsetY
  const opticalOffsetY = fontSize * KEY_LABEL_OPTICAL_CENTER_RATIO
  const multiLineOffsetY =
    lines.length > 1 ? ((lines.length - 1) * lineHeight) / 2 : 0
  return {
    textX,
    textY,
    textYDraw: textY - opticalOffsetY - multiLineOffsetY,
    fontSize,
    lineHeight,
    lines,
  }
}

export function getKeycapTopFace(
  key: { x: number; y: number; w: number; h: number; shape: string },
  unit: number,
): TopFaceRect {
  const { px, py, pw, ph } = getKeycapBaseRect(key, unit)
  return getTopFaceRects(key.shape, px, py, pw, ph)[0]!
}
