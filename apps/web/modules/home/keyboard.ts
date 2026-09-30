import type { KeyDef } from "@/modules/design/types/design"
import type { LayoutData } from "@/modules/design/data/layouts"

export type KeyRole = "alpha" | "mod" | "accent"

/** 与设计器一致：一颗键帽只有一个颜色，顶面与侧壁不区分。 */
interface KeycapColors {
  fill: string
  legend: string
}

export interface Colorway {
  id: "mist" | "ember" | "mint" | "sakura"
  case: string
  plate: string
  alpha: KeycapColors
  mod: KeycapColors
  accent: KeycapColors
}

export const COLORWAYS: readonly Colorway[] = [
  {
    id: "mist",
    case: "#dcd9ce",
    plate: "#c9c5b8",
    alpha: { fill: "#ecebe2", legend: "#1f2336" },
    mod: { fill: "#343b58", legend: "#e9e7de" },
    accent: { fill: "#bfd6ee", legend: "#1f2a44" },
  },
  {
    id: "ember",
    case: "#1c1f2b",
    plate: "#12141c",
    alpha: { fill: "#2c3042", legend: "#e8e6dd" },
    mod: { fill: "#474c63", legend: "#e8e6dd" },
    accent: { fill: "#e8743b", legend: "#fff7f0" },
  },
  {
    id: "mint",
    case: "#e3ebe4",
    plate: "#cbd8cd",
    alpha: { fill: "#f4f7f1", legend: "#34463b" },
    mod: { fill: "#8dbaa7", legend: "#fbfffc" },
    accent: { fill: "#f3c24f", legend: "#3b2e0f" },
  },
  {
    id: "sakura",
    case: "#f1e4e6",
    plate: "#e0cdd0",
    alpha: { fill: "#fff7f7", legend: "#6b3a45" },
    mod: { fill: "#e6a0af", legend: "#fffafb" },
    accent: { fill: "#6b3a45", legend: "#ffe9ee" },
  },
]

export const DEFAULT_COLORWAY = COLORWAYS[0]!

const ACCENT_KEYS = new Set([
  "KC_ESC",
  "KC_ENT",
  "KC_PENT",
  "KC_UP",
  "KC_DOWN",
  "KC_LEFT",
  "KC_RGHT",
])

const ALPHA_EXTRA_KEYS = new Set([
  "KC_GRV",
  "KC_MINS",
  "KC_EQL",
  "KC_LBRC",
  "KC_RBRC",
  "KC_BSLS",
  "KC_SCLN",
  "KC_QUOT",
  "KC_COMM",
  "KC_DOT",
  "KC_SLSH",
  "KC_SPC",
  "KC_PDOT",
  "KC_F1",
  "KC_F2",
  "KC_F3",
  "KC_F4",
  "KC_F9",
  "KC_F10",
  "KC_F11",
  "KC_F12",
])

export function getKeyRole(keyId: string): KeyRole {
  if (ACCENT_KEYS.has(keyId)) return "accent"
  if (/^KC_([A-Z]|[0-9]|P[0-9])$/.test(keyId)) return "alpha"
  if (ALPHA_EXTRA_KEYS.has(keyId)) return "alpha"
  return "mod"
}

export function getLayoutKeys(layout: LayoutData): KeyDef[] {
  return layout.rows.flatMap((row) =>
    row.keys.map((key) => ({ ...key, section: key.section ?? row.section }))
  )
}

export function getLayoutBounds(keys: readonly KeyDef[]) {
  return {
    width: Math.max(...keys.map((key) => key.x + key.w)),
    height: Math.max(...keys.map((key) => key.y + key.h)),
  }
}
