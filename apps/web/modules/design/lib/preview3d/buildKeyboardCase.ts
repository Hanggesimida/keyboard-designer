/**
 * 键位世界包围盒 → 单块托盘壳体（纯函数，无 Three）。
 *
 * 定位板叠在外框顶面上：顶面低于键帽底面（y = 0），避免与键帽相交。
 */

import { colord } from "colord"
import {
  isGradientValue,
  parseCssLinearGradient,
} from "@/modules/design/lib/design/gradientUtils"
import {
  CASE_BEZEL_U,
  CASE_BODY_COLOR,
  CASE_HEIGHT_U,
  CASE_PLATE_COLOR,
  CASE_TOP_GAP_U,
  PLATE_INSET_U,
  PLATE_THICKNESS_U,
} from "./constants"
import type { KeyboardWorldBounds } from "./layoutToWorld"
import type { PreviewCase } from "./types"

const MIN_PART_SIZE_U = 0.05

function resolveKeyboardHex(keyboardColor: string): string {
  if (isGradientValue(keyboardColor)) {
    const first = parseCssLinearGradient(keyboardColor)?.stops[0]?.color
    if (first) {
      const parsed = colord(first)
      if (parsed.isValid()) return parsed.toHex()
    }
  }
  const parsed = colord(keyboardColor)
  return parsed.isValid() ? parsed.toHex() : CASE_BODY_COLOR
}

/** 外框用键盘色；定位板略提亮/压暗，保持两层可辨 */
export function deriveCaseColors(keyboardColor: string): {
  bodyColor: string
  plateColor: string
} {
  const bodyColor = resolveKeyboardHex(keyboardColor)
  const c = colord(bodyColor)
  if (!c.isValid()) {
    return { bodyColor: CASE_BODY_COLOR, plateColor: CASE_PLATE_COLOR }
  }
  const plateColor = (c.isLight() ? c.darken(0.08) : c.lighten(0.1)).toHex()
  return { bodyColor, plateColor }
}

export function buildKeyboardCase(
  bounds: KeyboardWorldBounds,
  keyboardColor: string,
): PreviewCase {
  const bodyW = Math.max(bounds.width + 2 * CASE_BEZEL_U, MIN_PART_SIZE_U)
  const bodyD = Math.max(bounds.depth + 2 * CASE_BEZEL_U, MIN_PART_SIZE_U)
  const [cx, , cz] = bounds.center

  const plateTopY = -CASE_TOP_GAP_U
  const bodyTopY = plateTopY - PLATE_THICKNESS_U
  const bodyCenterY = bodyTopY - CASE_HEIGHT_U / 2
  const plateCenterY = plateTopY - PLATE_THICKNESS_U / 2

  const plateW = Math.max(bodyW - 2 * PLATE_INSET_U, MIN_PART_SIZE_U)
  const plateD = Math.max(bodyD - 2 * PLATE_INSET_U, MIN_PART_SIZE_U)
  const { bodyColor, plateColor } = deriveCaseColors(keyboardColor)

  return {
    body: {
      position: [cx, bodyCenterY, cz],
      size: [bodyW, CASE_HEIGHT_U, bodyD],
    },
    plate: {
      position: [cx, plateCenterY, cz],
      size: [plateW, PLATE_THICKNESS_U, plateD],
    },
    bodyColor,
    plateColor,
  }
}
