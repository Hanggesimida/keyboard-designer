export type LightingEnvironment = "studio" | "dark"
export type LightingChannelId = "underglow" | "backlight"
export type LightingEffectMode = "always" | "breath" | "wave" | "rainbow"
export type BacklightMode = LightingEffectMode | "onPress"
export type LightingDirection = "ltr" | "rtl" | "ttb" | "btt" | "diag"

export const LIGHTING_EFFECT_MODES = [
  "always",
  "breath",
  "wave",
  "rainbow",
] as const satisfies readonly LightingEffectMode[]

export const BACKLIGHT_MODES = [
  "always",
  "onPress",
  "breath",
  "wave",
  "rainbow",
] as const satisfies readonly BacklightMode[]

export const LIGHTING_DIRECTIONS = [
  "ltr",
  "rtl",
  "ttb",
  "btt",
  "diag",
] as const satisfies readonly LightingDirection[]

export interface LightingChannelSettings {
  enabled: boolean
  color: string
  /** 0 = 关闭，1 = 最大预览亮度。 */
  intensity: number
  mode: LightingEffectMode
  /** 0 = 最慢，1 = 最快；仅动态灯效使用。 */
  speed: number
  /** 波浪 / 彩虹的流动方向。 */
  direction: LightingDirection
}

export interface BacklightSettings extends Omit<LightingChannelSettings, "mode"> {
  /** always = 全盘常亮；onPress = 真实按键按下才亮。 */
  mode: BacklightMode
}

export interface LightingSettings {
  environment: LightingEnvironment
  underglow: LightingChannelSettings
  backlight: BacklightSettings
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const DEFAULT_SPEED = 0.5
const DEFAULT_DIRECTION: LightingDirection = "ltr"

export function clampLightingIntensity(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function clampLightingSpeed(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function isLightingEffectMode(
  value: unknown,
): value is LightingEffectMode {
  return (
    typeof value === "string" &&
    (LIGHTING_EFFECT_MODES as readonly string[]).includes(value)
  )
}

export function isBacklightMode(value: unknown): value is BacklightMode {
  return (
    typeof value === "string" &&
    (BACKLIGHT_MODES as readonly string[]).includes(value)
  )
}

export function isLightingDirection(value: unknown): value is LightingDirection {
  return (
    typeof value === "string" &&
    (LIGHTING_DIRECTIONS as readonly string[]).includes(value)
  )
}

export function isAnimatedLightingMode(
  mode: string,
): mode is "breath" | "wave" | "rainbow" {
  return mode === "breath" || mode === "wave" || mode === "rainbow"
}

export function lightingUsesBaseColor(mode: string): boolean {
  return mode !== "rainbow"
}

export function lightingUsesDirection(
  mode: string,
): mode is "wave" | "rainbow" {
  return mode === "wave" || mode === "rainbow"
}

export function createDefaultLightingSettings(): LightingSettings {
  return {
    environment: "studio",
    underglow: {
      enabled: false,
      color: "#7c3aed",
      intensity: 0.6,
      mode: "always",
      speed: DEFAULT_SPEED,
      direction: DEFAULT_DIRECTION,
    },
    backlight: {
      enabled: false,
      color: "#44d62c",
      intensity: 0.7,
      mode: "always",
      speed: DEFAULT_SPEED,
      direction: DEFAULT_DIRECTION,
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function normalizeChannel(
  value: unknown,
  fallback: LightingChannelSettings,
): LightingChannelSettings {
  const input = asRecord(value)
  if (!input) return { ...fallback }

  const intensity = input["intensity"]
  const speed = input["speed"]
  return {
    enabled:
      typeof input["enabled"] === "boolean"
        ? input["enabled"]
        : fallback.enabled,
    color:
      typeof input["color"] === "string" &&
      HEX_COLOR_PATTERN.test(input["color"])
        ? input["color"].toLowerCase()
        : fallback.color,
    intensity:
      typeof intensity === "number" && Number.isFinite(intensity)
        ? clampLightingIntensity(intensity)
        : fallback.intensity,
    mode: isLightingEffectMode(input["mode"]) ? input["mode"] : fallback.mode,
    speed:
      typeof speed === "number" && Number.isFinite(speed)
        ? clampLightingSpeed(speed)
        : fallback.speed,
    direction: isLightingDirection(input["direction"])
      ? input["direction"]
      : fallback.direction,
  }
}

/** 兼容没有灯效字段的历史设计，并拒绝非法环境、颜色及亮度。 */
export function normalizeLightingSettings(value: unknown): LightingSettings {
  const fallback = createDefaultLightingSettings()
  const input = asRecord(value)
  if (!input) return fallback

  const backlightInput = asRecord(input["backlight"])
  return {
    environment:
      input["environment"] === "dark" ? "dark" : fallback.environment,
    underglow: normalizeChannel(input["underglow"], fallback.underglow),
    backlight: {
      ...normalizeChannel(input["backlight"], {
        ...fallback.backlight,
        mode:
          fallback.backlight.mode === "onPress"
            ? "always"
            : fallback.backlight.mode,
      }),
      mode: isBacklightMode(backlightInput?.["mode"])
        ? backlightInput["mode"]
        : fallback.backlight.mode,
    },
  }
}
