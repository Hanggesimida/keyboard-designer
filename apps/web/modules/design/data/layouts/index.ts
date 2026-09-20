import type { KeyDef } from "@/modules/design/types/design"
import ansi104 from "./ansi-104.json"
import ansi108 from "./ansi-108.json"
import ansi108Kit from "./ansi-108-kit.json"
import ansi1800 from "./ansi-1800.json"
import ansi60 from "./ansi-60.json"
import ansi65 from "./ansi-65.json"
import ansi75 from "./ansi-75.json"
import ansi7584 from "./ansi-75-84.json"
import ansiTkl from "./ansi-tkl.json"

export interface LayoutRow {
  rowIndex: number
  /** 区分标准键盘区（base）与增补键帽区（supplement） */
  section?: "base" | "supplement"
  label: string
  keys: KeyDef[]
}

export interface LayoutData {
  id: string
  name: string
  totalKeys: number
  /** 布局坐标修订号；设计数据据此迁移画布元素坐标。 */
  revision: number
  baseUnit: number
  rows: LayoutRow[]
}

/** 规范 ID → 布局数据。仅登记当前对外使用的 ID。 */
export const LAYOUT_REGISTRY: Record<string, LayoutData> = {
  "ansi-60": ansi60 as unknown as LayoutData,
  "ansi-65": ansi65 as unknown as LayoutData,
  "ansi-75": ansi75 as unknown as LayoutData,
  "ansi-75-84": ansi7584 as unknown as LayoutData,
  "ansi-tkl": ansiTkl as unknown as LayoutData,
  "ansi-1800": ansi1800 as unknown as LayoutData,
  "ansi-104": ansi104 as unknown as LayoutData,
  "ansi-108": ansi108 as unknown as LayoutData,
  "ansi-108-kit": ansi108Kit as unknown as LayoutData,
}

/** 历史设计 JSON / 治具导出中的旧 ID → 规范 ID。 */
export const LAYOUT_ID_ALIASES: Readonly<Record<string, string>> = {
  "ansi-61": "ansi-60",
  "ansi-68": "ansi-65",
  "ansi-80": "ansi-75",
  "ansi-81": "ansi-75-84",
  "ansi-87": "ansi-tkl",
  "ansi-99": "ansi-1800",
  "ansi-144": "ansi-108-kit",
}

const DEFAULT_LAYOUT_ID = "ansi-108"

export function resolveLayoutId(templateId: string): string {
  return LAYOUT_ID_ALIASES[templateId] ?? templateId
}

export function isKnownLayoutId(templateId: string): boolean {
  return resolveLayoutId(templateId) in LAYOUT_REGISTRY
}

export function getLayoutData(templateId: string): LayoutData {
  const id = resolveLayoutId(templateId)
  return LAYOUT_REGISTRY[id] ?? LAYOUT_REGISTRY[DEFAULT_LAYOUT_ID]!
}

export function getAllKeysWithRow(layout: LayoutData) {
  return layout.rows.flatMap((row) =>
    row.keys.map((key) => ({ ...key, rowLabel: row.label })),
  )
}
