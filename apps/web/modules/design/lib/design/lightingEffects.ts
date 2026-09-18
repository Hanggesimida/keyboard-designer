import type {
  BacklightMode,
  LightingDirection,
} from "@/modules/design/lib/design/lighting"

export interface LightingRgb {
  r: number
  g: number
  b: number
}

export interface LightingEffectSample extends LightingRgb {
  /** 0–1，叠在通道亮度之上。 */
  amount: number
}

/** speed 0 → 慢，1 → 快。返回每秒循环次数。 */
export function lightingEffectHz(speed: number): number {
  return 0.14 + Math.min(1, Math.max(0, speed)) * 0.72
}

function fract(value: number): number {
  return value - Math.floor(value)
}

function hueToRgb(p: number, q: number, t: number): number {
  let cursor = t
  if (cursor < 0) cursor += 1
  if (cursor > 1) cursor -= 1
  if (cursor < 1 / 6) return p + (q - p) * 6 * cursor
  if (cursor < 1 / 2) return q
  if (cursor < 2 / 3) return p + (q - p) * (2 / 3 - cursor) * 6
  return p
}

function writeHsl(
  target: LightingRgb,
  hue: number,
  saturation: number,
  lightness: number,
): void {
  if (saturation === 0) {
    target.r = lightness
    target.g = lightness
    target.b = lightness
    return
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  target.r = hueToRgb(p, q, hue + 1 / 3)
  target.g = hueToRgb(p, q, hue)
  target.b = hueToRgb(p, q, hue - 1 / 3)
}

function writeRgb(target: LightingRgb, source: LightingRgb): void {
  target.r = source.r
  target.g = source.g
  target.b = source.b
}

/** 更尖的波峰，看起来像一束光扫过，而不是整盘一起闪。 */
function waveCrest(phase: number): number {
  const sine = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2)
  return sine * sine
}

function spatialCoord(
  u: number,
  v: number,
  direction: LightingDirection,
): number {
  switch (direction) {
    case "rtl":
      return 1 - u
    case "ttb":
      return v
    case "btt":
      return 1 - v
    case "diag":
      return u * 0.78 + v * 0.22
    case "ltr":
    default:
      return u
  }
}

/**
 * 把当前灯效颜色写入 `target`（0–1 RGB），并返回亮度系数。
 * `u`/`v` 是键位在键盘 XZ 范围上的 0–1 坐标。
 */
export function sampleLightingEffect(
  target: LightingEffectSample,
  mode: BacklightMode,
  opts: {
    timeSec: number
    speed: number
    baseColor: LightingRgb
    u: number
    v: number
    direction?: LightingDirection
  },
): LightingEffectSample {
  const cycle = opts.timeSec * lightingEffectHz(opts.speed)
  const along = spatialCoord(opts.u, opts.v, opts.direction ?? "ltr")

  switch (mode) {
    case "breath": {
      writeRgb(target, opts.baseColor)
      target.amount = 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(cycle * Math.PI * 2))
      return target
    }
    case "wave": {
      writeRgb(target, opts.baseColor)
      target.amount = 0.06 + 0.94 * waveCrest(along - cycle)
      return target
    }
    case "rainbow": {
      writeHsl(target, fract(along - cycle), 1, 0.56)
      target.amount = 1
      return target
    }
    case "onPress":
    case "always":
    default: {
      writeRgb(target, opts.baseColor)
      target.amount = 1
      return target
    }
  }
}
