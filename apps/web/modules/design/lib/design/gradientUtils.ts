import { colord } from "colord"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradientStop {
  id: string
  pos: number   // 0–100
  color: string // #rrggbb
}

export interface LinearGradient {
  type: "linear"
  angle: number // 0–359 deg (CSS convention: 0=up, 90=right)
  stops: GradientStop[]
}

export interface PaintBounds2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type ResolvedPaint =
  | { kind: "solid"; color: string }
  | { kind: "linear-gradient"; gradient: LinearGradient }

export interface LinearGradientProjection {
  start: [number, number]
  end: [number, number]
}

// ─── Detection ────────────────────────────────────────────────────────────────

export function isGradientValue(value: string): boolean {
  return value.trim().startsWith("linear-gradient(")
}

// ─── Serialization ────────────────────────────────────────────────────────────

export function gradientToCSS(g: LinearGradient): string {
  const sorted = [...g.stops].sort((a, b) => a.pos - b.pos)
  const stopStr = sorted.map((s) => `${s.color} ${s.pos}%`).join(", ")
  return `linear-gradient(${g.angle}deg, ${stopStr})`
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export function parseCssLinearGradient(css: string): LinearGradient | null {
  const m = css.trim().match(
    /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(.+)\)\s*$/,
  )
  if (!m) return null
  const angle = parseFloat(m[1]!)
  const stopsPart = m[2]!
  const stops: GradientStop[] = []
  const re = /(#[0-9a-fA-F]{6})\s+(\d+(?:\.\d+)?)%/g
  let match
  let idx = 0
  while ((match = re.exec(stopsPart)) !== null) {
    stops.push({
      id: `s${idx++}`,
      pos: parseFloat(match[2]!),
      color: match[1]!.toLowerCase(),
    })
  }
  if (stops.length < 2) return null
  return {
    type: "linear",
    angle: ((angle % 360) + 360) % 360,
    stops: stops
      .map((stop) => ({
        ...stop,
        pos: Math.min(100, Math.max(0, stop.pos)),
      }))
      .sort((a, b) => a.pos - b.pos),
  }
}

/** 将任意外部字符串收敛为渲染层可安全消费的纯色或线性渐变。 */
export function resolvePaint(
  value: string,
  fallback: string,
): ResolvedPaint {
  if (isGradientValue(value)) {
    const gradient = parseCssLinearGradient(value)
    if (gradient) return { kind: "linear-gradient", gradient }
  }
  const color = colord(value)
  if (color.isValid()) return { kind: "solid", color: color.toHex() }
  const fallbackColor = colord(fallback)
  return {
    kind: "solid",
    color: fallbackColor.isValid() ? fallbackColor.toHex() : "#000000",
  }
}

/**
 * 计算 CSS 线性渐变在指定矩形中的起止点。
 * 设计 Y 与 Three Z 都向下递增，因此同一结果可直接用于 2D XY 与 3D XZ。
 */
export function getLinearGradientProjection(
  angleDeg: number,
  bounds: PaintBounds2D,
): LinearGradientProjection {
  const width = Math.max(0, bounds.maxX - bounds.minX)
  const height = Math.max(0, bounds.maxY - bounds.minY)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const rad = (angleDeg * Math.PI) / 180
  const directionX = Math.sin(rad)
  const directionY = -Math.cos(rad)
  const halfLength =
    (Math.abs(directionX) * width + Math.abs(directionY) * height) / 2

  return {
    start: [
      centerX - directionX * halfLength,
      centerY - directionY * halfLength,
    ],
    end: [
      centerX + directionX * halfLength,
      centerY + directionY * halfLength,
    ],
  }
}

// ─── Color interpolation ──────────────────────────────────────────────────────

function lerpRgb(
  ca: { r: number; g: number; b: number },
  cb: { r: number; g: number; b: number },
  t: number,
) {
  return {
    r: Math.round(ca.r + (cb.r - ca.r) * t),
    g: Math.round(ca.g + (cb.g - ca.g) * t),
    b: Math.round(ca.b + (cb.b - ca.b) * t),
  }
}

export function interpolateGradientColor(g: LinearGradient, pos: number): string {
  const sorted = [...g.stops].sort((a, b) => a.pos - b.pos)
  if (sorted.length === 0) return "#000000"
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  if (pos <= first.pos) return first.color
  if (pos >= last.pos) return last.color
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!
    const b = sorted[i + 1]!
    if (pos >= a.pos && pos <= b.pos) {
      const t = b.pos === a.pos ? 0 : (pos - a.pos) / (b.pos - a.pos)
      const ca = colord(a.color).toRgb()
      const cb = colord(b.color).toRgb()
      return colord(lerpRgb(ca, cb, t)).toHex()
    }
  }
  return last.color
}

// ─── Default gradient ─────────────────────────────────────────────────────────

export function makeDefaultGradient(fromHex: string): LinearGradient {
  return {
    type: "linear",
    angle: 90,
    stops: [
      { id: "s0", pos: 0, color: fromHex },
      { id: "s1", pos: 100, color: "#ffffff" },
    ],
  }
}

