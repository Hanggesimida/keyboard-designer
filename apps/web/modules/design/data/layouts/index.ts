import type { KeyDef } from "@/modules/design/components/canvas/KeycapNode"
import ansi104 from "./ansi-104.json"
import ansi87 from "./ansi-87.json"
import ansi108 from "./ansi-108.json"
import ansi144 from "./ansi-144.json"
import ansi61 from "./ansi-61.json"
import ansi68 from "./ansi-68.json"
import ansi81 from "./ansi-81.json"

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
  baseUnit: number
  rows: LayoutRow[]
}

export const LAYOUT_REGISTRY: Record<string, LayoutData> = {
  "ansi-104": ansi104 as unknown as LayoutData,
  "ansi-87": ansi87 as unknown as LayoutData,
  "ansi-108": ansi108 as unknown as LayoutData,
  "ansi-144": ansi144 as unknown as LayoutData,
  "ansi-61": ansi61 as unknown as LayoutData,
  "ansi-68": ansi68 as unknown as LayoutData,
  "ansi-81": ansi81 as unknown as LayoutData
}

export function getLayoutData(templateId: string): LayoutData {
  return LAYOUT_REGISTRY[templateId] ?? LAYOUT_REGISTRY["ansi-104"]!
}

export function getAllKeysWithRow(layout: LayoutData) {
  return layout.rows.flatMap((row) =>
    row.keys.map((key) => ({ ...key, rowLabel: row.label })),
  )
}
