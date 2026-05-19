import { useMemo } from "react"
import type { KeyDef } from "@/modules/design/components/canvas/KeycapNode"
import { getLayoutData, getAllKeysWithRow } from "@/modules/design/data/layouts"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"

export interface RowedKeyDef extends KeyDef {
  rowLabel: string
}

/** 响应当前模板，返回 allKeys / keysById / baseUnit */
export function useLayoutKeys() {
  const templateId = useDesignUIStore((s) => s.templateId)
  return useMemo(() => {
    const layout = getLayoutData(templateId)
    const allKeys = getAllKeysWithRow(layout) as RowedKeyDef[]
    const keysById = new Map(allKeys.map((k) => [k.keyId, k]))
    return { allKeys, keysById, baseUnit: layout.baseUnit }
  }, [templateId])
}
