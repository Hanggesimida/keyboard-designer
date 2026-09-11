/** 模板与 base 键区包围盒 → 真实 GLB 外壳视图模型（纯函数，无 Three）。 */

import {
  getLinearGradientProjection,
  resolvePaint,
} from "@/modules/design/lib/design/gradientUtils"
import {
  CASE_BODY_COLOR,
  MODEL_SCALE,
} from "./constants"
import { resolveCaseModelAsset } from "./caseModelContract"
import type { KeyboardWorldBounds } from "./layoutToWorld"
import type { PreviewCase } from "./types"

export function buildKeyboardCase(
  templateId: string,
  bounds: KeyboardWorldBounds,
  keyboardPaint: string,
): PreviewCase | null {
  const asset = resolveCaseModelAsset(templateId)
  if (!asset) return null

  const [cx, , cz] = bounds.center
  const position: [number, number, number] = [cx, 0, cz]
  const localMin = asset.localBoundsMeters.min
  const localMax = asset.localBoundsMeters.max
  const min: [number, number, number] = [
    cx + localMin[0] * MODEL_SCALE,
    localMin[1] * MODEL_SCALE,
    cz + localMin[2] * MODEL_SCALE,
  ]
  const max: [number, number, number] = [
    cx + localMax[0] * MODEL_SCALE,
    localMax[1] * MODEL_SCALE,
    cz + localMax[2] * MODEL_SCALE,
  ]
  const bodyPaint = resolvePaint(keyboardPaint, CASE_BODY_COLOR)
  const paintProjection =
    bodyPaint.kind === "linear-gradient"
      ? getLinearGradientProjection(bodyPaint.gradient.angle, {
          minX: min[0],
          minY: min[2],
          maxX: max[0],
          maxY: max[2],
        })
      : null

  return {
    modelPath: asset.path,
    assetLayoutId: asset.layoutId,
    position,
    scale: MODEL_SCALE,
    bounds: {
      min,
      max,
      center: [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      ],
      width: max[0] - min[0],
      depth: max[2] - min[2],
    },
    bodyPaint,
    paintProjection,
  }
}
