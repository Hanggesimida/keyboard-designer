import {
  interpolateGradientColor,
  parseCssLinearGradient,
  type LinearGradient,
} from "@/modules/design/lib/design/gradientUtils"

export interface KeyCenter {
  id: string
  cx: number
  cy: number
}

/**
 * 按键中心在渐变方向轴上的投影，为每个键采样一个纯色 hex。
 * CSS 角度：0deg = 向上，90deg = 向右；方向向量 (sin θ, -cos θ)。
 * 投影范围归一化到 0–100；仅一点或 range=0 时取 t=0（起点色）。
 */
export function distributeGradientColors(
  gradient: LinearGradient | string,
  centers: ReadonlyArray<KeyCenter>,
): Record<string, string> {
  const parsed =
    typeof gradient === "string" ? parseCssLinearGradient(gradient) : gradient
  if (!parsed || centers.length === 0) return {}

  const rad = (parsed.angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)

  const projections = centers.map((c) => ({
    id: c.id,
    proj: c.cx * dx + c.cy * dy,
  }))

  const minProj = Math.min(...projections.map((p) => p.proj))
  const maxProj = Math.max(...projections.map((p) => p.proj))
  const range = maxProj - minProj

  const result: Record<string, string> = {}
  for (const { id, proj } of projections) {
    const t = range === 0 ? 0 : ((proj - minProj) / range) * 100
    result[id] = interpolateGradientColor(parsed, t)
  }
  return result
}

/** 从 layout 键定义收集中心点（layout 单位，结果等比）。 */
export function keyCentersFromDefs(
  keys: ReadonlyArray<{ keyId: string; x: number; y: number; w: number; h: number }>,
): KeyCenter[] {
  return keys.map((k) => ({
    id: k.keyId,
    cx: k.x + k.w / 2,
    cy: k.y + k.h / 2,
  }))
}
