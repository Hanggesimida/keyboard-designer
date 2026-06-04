import {
  KEYCAP_GAP,
  KEYCAP_PAD_LEFT,
  KEYCAP_PAD_RIGHT,
  KEYCAP_PAD_TOP,
  KEYCAP_PAD_BOTTOM,
} from "@/modules/design/components/canvas/KeycapNode"
import {
  STEPPED_PAD_LEFT,
  STEPPED_PAD_TOP,
  STEPPED_PAD_RIGHT,
  STEPPED_PAD_BOTTOM,
} from "@/modules/design/lib/design/keycapGeometry"
import type { KeycapOverride } from "@/modules/design/store/designUiStore"
import { LABEL_ALIGN_PAD } from "./constants"

export type AlignH = "left" | "center" | "right"
export type AlignV = "top" | "middle" | "bottom"

export interface AlignPos {
  alignH: AlignH
  alignV: AlignV
  title: string
}

export const ALIGN_POSITIONS: AlignPos[] = [
  { alignH: "left", alignV: "top", title: "左上对齐" },
  { alignH: "center", alignV: "top", title: "顶部居中" },
  { alignH: "right", alignV: "top", title: "右上对齐" },
  { alignH: "left", alignV: "middle", title: "左侧居中" },
  { alignH: "center", alignV: "middle", title: "完全居中" },
  { alignH: "right", alignV: "middle", title: "右侧居中" },
  { alignH: "left", alignV: "bottom", title: "左下对齐" },
  { alignH: "center", alignV: "bottom", title: "底部居中" },
  { alignH: "right", alignV: "bottom", title: "右下对齐" },
]

/** 根据 keyDef 尺寸与形状（以 unit 为基准）计算顶面宽高（SVG 单位） */
export function getTopFaceSize(keyDef: { w: number; h: number; shape?: string }, unit: number) {
  const base = keyDef.w * unit - KEYCAP_GAP
  const baseH = keyDef.h * unit - KEYCAP_GAP
  if (keyDef.shape === "stepped") {
    return {
      topW: base - STEPPED_PAD_LEFT - STEPPED_PAD_RIGHT,
      topH: baseH - STEPPED_PAD_TOP - STEPPED_PAD_BOTTOM,
    }
  }
  return {
    topW: base - KEYCAP_PAD_LEFT - KEYCAP_PAD_RIGHT,
    topH: baseH - KEYCAP_PAD_TOP - KEYCAP_PAD_BOTTOM,
  }
}

/** 根据对齐方向计算 labelOffsetX / labelOffsetY（相对顶面中心） */
export function calcAlignOffset(
  topW: number,
  topH: number,
  textHalfW: number,
  textHalfH: number,
  alignH: AlignH,
  alignV: AlignV,
) {
  let offsetX = 0
  let offsetY = 0

  switch (alignH) {
    case "left":
      offsetX = -(topW / 2 - LABEL_ALIGN_PAD - textHalfW)
      break
    case "center":
      offsetX = 0
      break
    case "right":
      offsetX = topW / 2 - LABEL_ALIGN_PAD - textHalfW
      break
  }
  switch (alignV) {
    case "top":
      offsetY = -(topH / 2 - LABEL_ALIGN_PAD - textHalfH)
      break
    case "middle":
      offsetY = 0
      break
    case "bottom":
      offsetY = topH / 2 - LABEL_ALIGN_PAD - textHalfH
      break
  }

  return { offsetX, offsetY }
}

export interface TextMetricsLike {
  halfW?: number
  halfH?: number
}

/** 单键对齐：无 metrics 时用字号与文案长度估算半宽 */
export function resolveTextHalfDimensionsSingle(
  metrics: TextMetricsLike | null | undefined,
  fontSize: number,
  label: string,
) {
  const halfH = metrics?.halfH ?? fontSize / 2
  const halfW = metrics?.halfW ?? label.length * fontSize * 0.3
  return { halfW, halfH }
}

/** 多键对齐：无 metrics 时半宽为 0（与原行为一致） */
export function resolveTextHalfDimensionsMulti(
  metrics: TextMetricsLike | null | undefined,
  fontSize: number,
) {
  const halfH = metrics?.halfH ?? fontSize / 2
  const halfW = metrics?.halfW ?? 0
  return { halfW, halfH }
}

export function computeLabelAlignPatch(
  keyDef: { w: number; h: number; shape?: string },
  unit: number,
  alignH: AlignH,
  alignV: AlignV,
  textHalfW: number,
  textHalfH: number,
): Pick<KeycapOverride, "labelOffsetX" | "labelOffsetY"> {
  const { topW, topH } = getTopFaceSize(keyDef, unit)
  const { offsetX, offsetY } = calcAlignOffset(
    topW,
    topH,
    textHalfW,
    textHalfH,
    alignH,
    alignV,
  )
  return { labelOffsetX: offsetX, labelOffsetY: offsetY }
}
