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

// ─── Detection ────────────────────────────────────────────────────────────────

export function isGradientValue(value: string): boolean {
  return value.startsWith("linear-gradient(")
}

// ─── Serialization ────────────────────────────────────────────────────────────

export function gradientToCSS(g: LinearGradient): string {
  const sorted = [...g.stops].sort((a, b) => a.pos - b.pos)
  const stopStr = sorted.map((s) => `${s.color} ${s.pos}%`).join(", ")
  return `linear-gradient(${g.angle}deg, ${stopStr})`
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export function parseCssLinearGradient(css: string): LinearGradient | null {
  const m = css.match(/^linear-gradient\(\s*(\d+(?:\.\d+)?)deg\s*,\s*(.+)\)\s*$/)
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
  return { type: "linear", angle, stops }
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

// ─── SVG gradient conversion ──────────────────────────────────────────────────

/**
 * Convert a CSS gradient angle to SVG linearGradient x1/y1/x2/y2
 * (in objectBoundingBox coordinates).
 * CSS angle: 0deg = to top, 90deg = to right, clockwise.
 */
export function cssAngleToSvgCoords(angleDeg: number): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x1: 0.5 - 0.5 * Math.sin(rad),
    y1: 0.5 + 0.5 * Math.cos(rad),
    x2: 0.5 + 0.5 * Math.sin(rad),
    y2: 0.5 - 0.5 * Math.cos(rad),
  }
}
